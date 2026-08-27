import { Routes, Route } from "react-router";
import { AuthProvider } from "@/lib/auth";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Board from "@/pages/Board";
import PostDetail from "@/pages/PostDetail";
import NewPost from "@/pages/NewPost";
import Species from "@/pages/Species";
import SpeciesDetail from "@/pages/SpeciesDetail";
import Water from "@/pages/Water";
import Equipment from "@/pages/Equipment";
import Merchants from "@/pages/Merchants";
import MerchantApply from "@/pages/MerchantApply";
import Profile from "@/pages/Profile";
import Login from "@/pages/Login";
import Admin from "@/pages/Admin";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/board/:slug" element={<Board />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/new" element={<NewPost />} />
          <Route path="/species" element={<Species />} />
          <Route path="/species/:id" element={<SpeciesDetail />} />
          <Route path="/water" element={<Water />} />
          <Route path="/equipment" element={<Equipment />} />
          <Route path="/merchants" element={<Merchants />} />
          <Route path="/merchant/apply" element={<MerchantApply />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
