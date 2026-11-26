import React, { useState } from "react";
import { Button } from "../ui/button";
import { Search } from "lucide-react";
import { PiBuildingOfficeBold } from "react-icons/pi";
import { useDispatch } from "react-redux";
import { setSearchedQuery } from "@/redux/jobSlice";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const [query, setQuery] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const searchjobHandler = () => {
    dispatch(setSearchedQuery(query));
    navigate("/browse");
  };
  return (
    <div className="px-4 md:px-0">
      <div className="text-center">
        <div className="flex flex-col gap-5 my-10">
          <div className="mt-5 mb-5"></div>
          <h2 className="mt-5 text-3xl md:text-5xl font-bold leading-tight">
            Find the Job That <span className="text-[#6A38C2]">Fits You</span>, Not Just Any Job.
          </h2>
          <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto">
            Smart, AI-powered recommendations match your skills to the right roles, so you spend less time searching and more time getting hired.
          </p>
          <div className="flex w-full sm:w-[85%] md:w-[65%] lg:w-[50%] shadow-[0_8px_30px_rgb(0,0,0,0.08)] bg-white rounded-full items-center p-2 mx-auto mt-8 border border-gray-100 transition-all hover:shadow-2xl">
            <input
              type="text"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  searchjobHandler();
                }
              }}
              placeholder="Find Your Future Job..."
              className="outline-none border-none w-full py-3 px-6 bg-transparent text-gray-800 text-base md:text-lg placeholder:text-gray-400"
            />
            <Button 
              onClick={searchjobHandler} 
              className="rounded-full bg-[#6B3AC2] hover:bg-[#5b30a6] h-12 w-12 md:w-32 flex items-center justify-center gap-2 transition-colors shrink-0"
            >
              <Search className="h-5 w-5" />
              <span className="hidden md:block font-semibold">Search</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
