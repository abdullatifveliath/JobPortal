import React, { useEffect } from "react";
import Navbar from "./Navbar";
import Job1 from "./Job1";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { fetchSavedJobs } from "@/hooks/useSavedJobs";
import { motion } from "framer-motion";

const SavedJobs = () => {
  const { savedJobs } = useSelector((store) => store.job);
  const { user } = useSelector((store) => store.auth);
  const dispatch = useDispatch();

  // refresh from the server - jobs may have been saved on another device
  useEffect(() => {
    if (user) fetchSavedJobs(dispatch).catch(() => {});
  }, [user, dispatch]);

  return (
    <div>
      <Navbar />
      <div className="max-w-7xl mx-auto mt-5 px-4 md:px-8">
        <h1 className="text-2xl font-bold mb-5">Saved Jobs</h1>
        {!user ? (
          <span className="text-gray-500">
            <Link to="/login" className="text-[#6B3AC2] hover:underline">Log in</Link> to see your saved jobs.
          </span>
        ) : !savedJobs || savedJobs.length <= 0 ? (
          <span className="text-gray-500">You haven't saved any jobs yet.</span>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedJobs.map((job) => (
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
        )}
      </div>
    </div>
  );
};

export default SavedJobs;
