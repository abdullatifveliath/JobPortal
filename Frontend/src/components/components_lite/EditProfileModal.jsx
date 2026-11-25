import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { USER_API_ENDPOINT } from "@/utils/data";
import { setUser } from "@/redux/authSlice";
import { Loader2, KeyRound } from "lucide-react";

const MAX_RESUME_SIZE = 5 * 1024 * 1024; // 5 MB, same as the server

const EditProfileModal = ({ open, setOpen }) => {
  const [loading, setLoading] = useState(false);
  const { user } = useSelector((store) => store.auth);

  const [input, setInput] = useState({
    fullname: user?.fullname || "",
    email: user?.email || "",
    phoneNumber: user?.phoneNumber || "",
    bio: user?.profile?.bio || "",
    skills: user?.profile?.skills?.join(", ") || "",
  });
  const [resumeFile, setResumeFile] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const changePasswordHandler = () => {
    setOpen(false);
    navigate("/forgot-password", {
      state: { email: user?.email, fromProfile: true },
    });
  };

  const changeEventHandler = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  const handleFileChange = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("fullname", input.fullname);
    formData.append("email", input.email);
    formData.append("phoneNumber", input.phoneNumber);
    formData.append("bio", input.bio);
    formData.append("skills", input.skills);

    if (resumeFile) {
      formData.append("resume", resumeFile);
    }

    try {
      setLoading(true);
      const res = await axios.post(
        `${USER_API_ENDPOINT}/profile/update`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
        }
      );
      if (res.data.success) {
        // dispatch(setUser(res.data.user));
        dispatch(setUser({ ...res.data.user, skills: input.skills }));
        toast.success(res.data.message);
        setResumeFile(null);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Could not update profile");
    } finally {
      setLoading(false);
    }
    setOpen(false);

  };

  const ResumeChangeHandler = (e) => {
    const file = e.target.files?.[0];
    if (!file) return setResumeFile(null);
    // same rules as the server, checked early so the user gets instant feedback
    if (!/\.(pdf|docx?)$/i.test(file.name)) {
      toast.error("Resume must be a PDF, DOC or DOCX file");
      e.target.value = "";
      return setResumeFile(null);
    }
    if (file.size > MAX_RESUME_SIZE) {
      toast.error("Resume must be 5 MB or smaller");
      e.target.value = "";
      return setResumeFile(null);
    }
    setResumeFile(file);
  };

  return (
    <div>
      {/* onOpenChange lets the X button, Escape key and outside clicks close it */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-[500px] w-[95vw] rounded-md max-h-[90vh] overflow-y-auto"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          {/* Form for editing profile */}
          <form onSubmit={handleFileChange}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label htmlFor="name" className="text-left sm:text-right">
                  Name
                </Label>
                <input
                  type="text"
                  id="name"
                  value={input.fullname}
                  name="fullname"
                  onChange={changeEventHandler}
                  className="col-span-1 sm:col-span-3 border border-gray-300 rounded-md p-2 w-full"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label htmlFor="email" className="text-left sm:text-right">
                  Email
                </Label>
                <input
                  type="email"
                  id="email"
                  value={input.email}
                  name="email"
                  readOnly
                  title="Email can't be changed - it's your verified login"
                  className="col-span-1 sm:col-span-3 border border-gray-300 rounded-md p-2 w-full bg-gray-100 text-gray-500 cursor-not-allowed"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label htmlFor="phone" className="text-left sm:text-right">
                  Phone
                </Label>
                <input
                  type="tel"
                  id="phone"
                  value={input.phoneNumber} // Ensure this is correctly set
                  name="phoneNumber" // Ensure this matches the expected key
                  onChange={changeEventHandler}
                  className="col-span-1 sm:col-span-3 border border-gray-300 rounded-md p-2 w-full"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label htmlFor="bio" className="text-left sm:text-right">
                  Bio
                </Label>
                <input
                  type="bio"
                  id="bio"
                  value={input.bio}
                  name="bio"
                  onChange={changeEventHandler}
                  className="col-span-1 sm:col-span-3 border border-gray-300 rounded-md p-2 w-full"
                />
              </div>
              {/* skills */}
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label htmlFor="skills" className="text-left sm:text-right">
                  Skills
                </Label>
                <input
                  id="skills"
                  name="skills"
                  value={input.skills}
                  onChange={changeEventHandler}
                  className="col-span-1 sm:col-span-3 border border-gray-300 rounded-md p-2 w-full"
                />
              </div>
              {/* Resume file */}
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label htmlFor="resume" className="text-left sm:text-right">
                  Resume
                </Label>
                <div className="col-span-1 sm:col-span-3">
                  <input
                    type="file"
                    id="resume"
                    name="resume"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={ResumeChangeHandler}
                    className="border border-gray-300 rounded-md p-2 w-full text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1 break-all">
                    {user?.profile?.resume
                      ? `Current: ${user.profile.resumeOriginalName || "uploaded resume"}. Choose a file to replace it.`
                      : "PDF, DOC or DOCX, up to 5 MB."}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              {loading ? (
                <Button className="w-full my-4">
                  {" "}
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait{" "}
                </Button>
              ) : (
                <Button type="submit" className="w-full my-4">
                  Save
                </Button>
              )}
            </DialogFooter>
          </form>

          {/* Change password (sends an OTP to the registered email) */}
          <div className="border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={changePasswordHandler}
              className="w-full flex items-center gap-2"
            >
              <KeyRound className="h-4 w-4" />
              Change Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditProfileModal;
