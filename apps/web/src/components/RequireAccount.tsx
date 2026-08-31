import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingState } from "./AsyncState";
import { api } from "../lib/api";
import { useApi } from "../lib/use-api";

export function RequireAccount() {
  const location=useLocation(),state=useApi(api.me);
  if(state.loading)return <div className="page-shell py-20"><LoadingState label="正在确认账户…"/></div>;
  if(state.error)return <Navigate to={`/auth/login?next=${encodeURIComponent(location.pathname+location.search)}`} replace/>;
  return <Outlet/>;
}
