import { Box, Text } from "ink";
import { Input } from "./input";
import { useColors } from "../theme-context";

interface SearchBarProps {
  readonly isSearching: boolean;
  readonly query: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit?: (value: string) => void;
}

export const SearchBar = ({ isSearching, query, onChange, onSubmit }: SearchBarProps) => {
  const COLORS = useColors();

  if (isSearching) {
    return (
      <Box marginTop={1}>
        <Text color={COLORS.DIM}>/</Text>
        <Input focus value={query} onChange={onChange} onSubmit={onSubmit} />
      </Box>
    );
  }

  if (query) {
    return (
      <Box marginTop={1}>
        <Text color={COLORS.DIM}>/{query}</Text>
      </Box>
    );
  }

  return null;
};
