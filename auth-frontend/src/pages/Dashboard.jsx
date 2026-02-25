import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import ProfileForm from "../pages/ProfileForm";
import GenerateMealScreen from "./GenerateMealForm";
import ClientList from "./ListClients";
import NotSubscribed from "./NotSubscribed";


export default function Dashboard() {
  const {user, hasProfile, loadingProfile, refreshProfile} = useAuth();

  return user?.is_subscribed ? (
    <ClientList />
  ) : (
    <div className="p-6">
       {user? <p>Welcome, {user?.username}</p> : <p>Loading...</p>}
       <NotSubscribed />
    </div>
  );

}