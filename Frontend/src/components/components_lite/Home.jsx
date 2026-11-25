import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import Navbar from "./Navbar";
import Header from "./Header";
import Categories from "./Categories";
import LatestJobs from "./LatestJobs";
import useGetAllJobs from "@/hooks/useGetAllJobs";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const { loading } = useGetAllJobs(); // Trigger data fetch
  const jobs = useSelector((state) => state.job.allJobs); // Access Redux state

  const { user } = useSelector((store) => store.auth);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === "Recruiter") {
      navigate("/admin/companies");
    } else if (user?.role === "Admin") {
      navigate("/super-admin");
    }
  }, []);

  return (
    <div>
      <Navbar />
      <Header />
      <Categories />
      <LatestJobs jobs={jobs} loading={loading} />
    </div>
  );
};

export default Home;
