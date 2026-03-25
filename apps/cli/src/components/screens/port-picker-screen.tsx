import { useState } from "react";
import { Box, Text, useInput } from "ink";
import figures from "figures";
import type { ChangesFor, SavedFlow } from "@expect/shared/models";
import { PORT_PICKER_VISIBLE_COUNT } from "../../constants";
import { useColors } from "../theme-context";
import { useNavigationStore, Screen } from "../../stores/use-navigation";
import { useProjectPreferencesStore } from "../../stores/use-project-preferences";
import { useListeningPorts } from "../../hooks/use-listening-ports";
import { useScrollableList } from "../../hooks/use-scrollable-list";
import { SearchBar } from "../ui/search-bar";
import { Clickable } from "../ui/clickable";
import { Logo } from "../ui/logo";

interface PortPickerScreenProps {
  changesFor: ChangesFor;
  instruction: string;
  savedFlow?: SavedFlow;
  requiresCookies?: boolean;
}

interface PortEntry {
  readonly port: number;
  readonly processName: string;
  readonly cwd: string;
}

const portToUrl = (port: number): string => `http://localhost:${port}`;

const matchesSearch = (entry: PortEntry, query: string): boolean => {
  const lowerQuery = query.toLowerCase();
  return (
    String(entry.port).includes(lowerQuery) ||
    entry.processName.toLowerCase().includes(lowerQuery) ||
    entry.cwd.toLowerCase().includes(lowerQuery)
  );
};

const isPortOrUrl = (value: string): number | undefined => {
  const trimmed = value.trim();

  const portNumber = Number(trimmed);
  if (Number.isInteger(portNumber) && portNumber >= 1 && portNumber <= 65535) {
    return portNumber;
  }

  const urlMatch = trimmed.match(/:(\d+)\/?$/);
  if (urlMatch) {
    const extracted = Number(urlMatch[1]);
    if (Number.isInteger(extracted) && extracted >= 1 && extracted <= 65535) {
      return extracted;
    }
  }

  return undefined;
};

export const PortPickerScreen = ({
  changesFor,
  instruction,
  savedFlow,
  requiresCookies,
}: PortPickerScreenProps) => {
  const COLORS = useColors();
  const setScreen = useNavigationStore((state) => state.setScreen);
  const lastBaseUrl = useProjectPreferencesStore((state) => state.lastBaseUrl);
  const setLastBaseUrl = useProjectPreferencesStore((state) => state.setLastBaseUrl);
  const { data: listeningPorts = [] } = useListeningPorts();

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPorts, setSelectedPorts] = useState<Set<number>>(() => {
    if (!lastBaseUrl) return new Set();
    const urlMatch = lastBaseUrl.match(/:(\d+)/);
    if (urlMatch) return new Set([Number(urlMatch[1])]);
    return new Set();
  });

  const entries: PortEntry[] = listeningPorts.map((listening) => ({
    port: listening.port,
    processName: listening.processName,
    cwd: listening.cwd,
  }));

  const filteredEntries = searchQuery
    ? entries.filter((entry) => matchesSearch(entry, searchQuery))
    : entries;

  const itemCount = filteredEntries.length + 1;

  const { highlightedIndex, setHighlightedIndex, scrollOffset, handleNavigation } =
    useScrollableList({
      itemCount,
      visibleCount: PORT_PICKER_VISIBLE_COUNT,
    });

  const navigateToTesting = (baseUrls: readonly string[]) => {
    const lastUrl = baseUrls.length > 0 ? baseUrls[0] : undefined;
    setLastBaseUrl(lastUrl);
    setScreen(
      Screen.Testing({
        changesFor,
        instruction,
        savedFlow,
        requiresCookies,
        baseUrls: baseUrls.length > 0 ? baseUrls : undefined,
      }),
    );
  };

  const togglePort = (port: number) => {
    setSelectedPorts((previous) => {
      const next = new Set(previous);
      if (next.has(port)) {
        next.delete(port);
      } else {
        next.add(port);
      }
      return next;
    });
  };

  const confirmSelection = () => {
    if (highlightedIndex === filteredEntries.length) {
      navigateToTesting([]);
      return;
    }

    if (selectedPorts.size > 0) {
      const urls = [...selectedPorts].sort((left, right) => left - right).map(portToUrl);
      navigateToTesting(urls);
      return;
    }

    const entry = filteredEntries[highlightedIndex];
    if (entry) {
      navigateToTesting([portToUrl(entry.port)]);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setHighlightedIndex(0);
  };

  const handleSearchSubmit = (value: string) => {
    const customPort = isPortOrUrl(value);
    if (customPort) {
      togglePort(customPort);
      setIsSearching(false);
      setSearchQuery("");
      return;
    }
    setIsSearching(false);
  };

  useInput((input, key) => {
    if (isSearching) {
      if (key.escape) {
        setIsSearching(false);
        return;
      }
      return;
    }

    if (handleNavigation(input, key)) return;

    if (input === "/") {
      setIsSearching(true);
      return;
    }

    if (input === " ") {
      const entry = filteredEntries[highlightedIndex];
      if (entry) {
        togglePort(entry.port);
      }
      return;
    }

    if (key.return) {
      confirmSelection();
    }
  });

  const portListVisibleCount = PORT_PICKER_VISIBLE_COUNT - 1; // reserve 1 row for "Skip" option
  const visibleItems = filteredEntries.slice(scrollOffset, scrollOffset + portListVisibleCount);
  const skipVisible = scrollOffset + portListVisibleCount >= filteredEntries.length;

  const highlightedEntry = filteredEntries[highlightedIndex];
  const isSkipHighlighted = highlightedIndex === filteredEntries.length;

  return (
    <Box flexDirection="column" width="100%" paddingY={1} paddingX={1}>
      <Box>
        <Logo />
        <Text wrap="truncate">
          {" "}
          <Text color={COLORS.DIM}>{figures.pointerSmall}</Text>{" "}
          <Text color={COLORS.TEXT}>{instruction}</Text>
        </Text>
      </Box>

      <Box marginTop={1}>
        {selectedPorts.size > 0 && (
          <Text color={COLORS.GREEN}>
            {figures.tick}{" "}
            {[...selectedPorts]
              .sort((left, right) => left - right)
              .map(portToUrl)
              .join(", ")}
          </Text>
        )}
        {selectedPorts.size === 0 && !isSkipHighlighted && highlightedEntry && (
          <Text color={COLORS.DIM}>
            {figures.arrowRight} {portToUrl(highlightedEntry.port)}
          </Text>
        )}
        {selectedPorts.size === 0 && isSkipHighlighted && (
          <Text color={COLORS.YELLOW}>
            {figures.warning} No base URL. The agent won{"'"}t know where your dev server is.
          </Text>
        )}
      </Box>

      <Box flexDirection="column" marginTop={1}>
        {visibleItems.map((entry, index) => {
          const actualIndex = index + scrollOffset;
          const isHighlighted = actualIndex === highlightedIndex;
          const isSelected = selectedPorts.has(entry.port);

          return (
            <Clickable
              key={entry.port}
              onClick={() => {
                setHighlightedIndex(actualIndex);
                togglePort(entry.port);
              }}
            >
              <Box>
                <Text color={isHighlighted ? COLORS.PRIMARY : COLORS.DIM}>
                  {isHighlighted ? `${figures.pointer} ` : "  "}
                </Text>
                <Text color={isSelected ? COLORS.PRIMARY : COLORS.DIM}>
                  {isSelected ? figures.checkboxOn : figures.checkboxOff}{" "}
                </Text>
                <Text color={isHighlighted ? COLORS.PRIMARY : COLORS.TEXT} bold={isHighlighted}>
                  :{entry.port}
                </Text>
                {entry.processName && <Text color={COLORS.DIM}> {entry.processName}</Text>}
                {entry.cwd && <Text color={COLORS.DIM}> {entry.cwd}</Text>}
              </Box>
            </Clickable>
          );
        })}
        {skipVisible && (
          <Clickable
            onClick={() => {
              setHighlightedIndex(filteredEntries.length);
              navigateToTesting([]);
            }}
          >
            <Box>
              <Text color={isSkipHighlighted ? COLORS.PRIMARY : COLORS.DIM}>
                {isSkipHighlighted ? `${figures.pointer} ` : "  "}
              </Text>
              <Text
                color={isSkipHighlighted ? COLORS.PRIMARY : COLORS.DIM}
                bold={isSkipHighlighted}
              >
                Skip {figures.arrowRight} no base URL
              </Text>
            </Box>
          </Clickable>
        )}
        {filteredEntries.length === 0 && !skipVisible && (
          <Text color={COLORS.DIM}>No matching ports</Text>
        )}
      </Box>

      <SearchBar
        isSearching={isSearching}
        query={searchQuery}
        onChange={handleSearchChange}
        onSubmit={handleSearchSubmit}
      />
    </Box>
  );
};
