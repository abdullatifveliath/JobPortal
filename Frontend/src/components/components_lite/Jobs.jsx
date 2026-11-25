import React, { useMemo, useState } from "react";
import Navbar from "./Navbar";
import FilterCard from "./Filtercard";
import Job1 from "./Job1";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import useGetAllJobs from "@/hooks/useGetAllJobs";
import { applyJobFilters, emptyFilters } from "@/utils/jobFilters";

const Jobs = () => {
  // Always load the full job list here, so filters never run on a leftover
  // subset from an earlier Browse search.
  const { loading } = useGetAllJobs("");
  const { allJobs } = useSelector((store) => store.job);
  const [selected, setSelected] = useState(emptyFilters);

  const filterJobs = useMemo(
    () => applyJobFilters(allJobs || [], selected),
    [allJobs, selected]
  );

  return (
    <div>
      <Navbar />
      <div className="max-w-7xl mx-auto mt-5 px-4 md:px-8">
        <div className="flex flex-col md:flex-row gap-5">
          <div className="w-full md:w-1/5 md:min-w-[250px] md:h-[88vh] md:overflow-y-auto p-1 pb-5 pr-2">
            <FilterCard
              selected={selected}
              onChange={setSelected}
              onClear={() => setSelected(emptyFilters())}
            />
          </div>

          {loading && filterJobs.length === 0 ? (
            <span>Loading jobs...</span>
          ) : filterJobs.length <= 0 ? (
            <span>Job not found</span>
          ) : (
            <div className="flex-1 h-auto md:h-[88vh] md:overflow-y-auto pb-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filterJobs.map((job) => (
                  <motion.div
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.4 }}
                    key={job._id}
                    className="h-full"
                  >
                    <Job1 job={job} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Jobs;
