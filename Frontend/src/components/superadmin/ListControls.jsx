import { Input } from "../ui/input";
import { Button } from "../ui/button";

// search box shown above each admin table
export const SearchBox = ({ value, onChange, placeholder, children }) => (
  <div className="flex flex-col sm:flex-row gap-3 mb-4">
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="sm:max-w-xs"
    />
    {children}
  </div>
);

// "Page 2 of 5" with previous / next buttons, plus the empty / loading states
export const ListFooter = ({ list, noun }) => (
  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 text-sm text-gray-600">
    <span>
      {list.loading ? "Loading…" : `${list.total} ${noun}${list.total === 1 ? "" : "s"}`}
    </span>
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={list.page <= 1 || list.loading}
        onClick={() => list.setPage(list.page - 1)}
      >
        Previous
      </Button>
      <span>
        Page {list.page} of {list.totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={list.page >= list.totalPages || list.loading}
        onClick={() => list.setPage(list.page + 1)}
      >
        Next
      </Button>
    </div>
  </div>
);
