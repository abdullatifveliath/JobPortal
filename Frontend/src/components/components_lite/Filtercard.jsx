import React from "react";
import { filterData, hasActiveFilters } from "@/utils/jobFilters";

// Controlled component: the Jobs page owns the selected filters.
const Filter = ({ selected, onChange, onClear }) => {
  const toggle = (group, label) => {
    const current = selected[group] || [];
    const next = current.includes(label)
      ? current.filter((item) => item !== label)
      : [...current, label];
    onChange({ ...selected, [group]: next });
  };

  return (
    <div className="w-full p-5 bg-white rounded-md border border-gray-100 shadow-md">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-lg">Filter Jobs</h1>
        {hasActiveFilters(selected) && (
          <button
            type="button"
            onClick={onClear}
            className="text-sm text-[#6B3AC2] hover:underline"
          >
            Clear all
          </button>
        )}
      </div>
      <hr className="mt-3" />
      <div className="mt-5">
        {filterData.map((data, index) => (
          <div key={data.filterType} className="mb-4">
            <h2 className="font-bold text-lg mb-2">{data.filterType}</h2>
            {data.options.map(({ label }, indx) => {
              const itemId = `Id${index}-${indx}`;
              return (
                <div key={itemId} className="flex items-center space-x-2 my-2">
                  <input
                    type="checkbox"
                    id={itemId}
                    value={label}
                    checked={(selected[data.filterType] || []).includes(label)}
                    onChange={() => toggle(data.filterType, label)}
                    className="w-4 h-4 text-[#6B3AC2] border-gray-300 rounded focus:ring-[#6B3AC2] cursor-pointer"
                  />
                  <label htmlFor={itemId} className="cursor-pointer text-gray-700">
                    {label}
                  </label>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Filter;
