import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { RequireAccount } from "./components/RequireAccount";
import { AccountSettingsPage } from "./pages/AccountSettingsPage";
import { AboutPage } from "./pages/AboutPage";
import { AutomatedInterviewPage } from "./pages/AutomatedInterviewPage";
import { AuthPage } from "./pages/AuthPage";
import { ClaimPage } from "./pages/ClaimPage";
import { ClaimsPage } from "./pages/ClaimsPage";
import { CorrectionsPage } from "./pages/CorrectionsPage";
import { DirectorAccountsPage } from "./pages/DirectorAccountsPage";
import { DriftPage } from "./pages/DriftPage";
import { HomePage } from "./pages/HomePage";
import { IngestionPage } from "./pages/IngestionPage";
import { MethodPage } from "./pages/MethodPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PersonPage } from "./pages/PersonPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { RecordEditorPage } from "./pages/RecordEditorPage";
import { RecordPage } from "./pages/RecordPage";
import { RecordsPage } from "./pages/RecordsPage";
import { SearchPage } from "./pages/SearchPage";
import { StudioPage } from "./pages/StudioPage";
import { TermsPage } from "./pages/TermsPage";
import { YearPage } from "./pages/YearPage";

const router=createBrowserRouter([{element:<AppShell/>,children:[
  {path:"/",element:<HomePage/>},{path:"/records",element:<RecordsPage/>},{path:"/records/:recordNumber",element:<RecordPage/>},{path:"/drift",element:<DriftPage/>},{path:"/search",element:<SearchPage/>},{path:"/people/:slug",element:<PersonPage/>},{path:"/years/:year",element:<YearPage/>},{path:"/method",element:<MethodPage/>},{path:"/about",element:<AboutPage/>},{path:"/privacy",element:<PrivacyPage/>},{path:"/terms",element:<TermsPage/>},{path:"/corrections",element:<CorrectionsPage/>},
  {path:"/auth/login",element:<AuthPage mode="login"/>},{path:"/auth/register",element:<AuthPage mode="register"/>},{path:"/auth/forgot-password",element:<AuthPage mode="forgot"/>},{path:"/auth/reset-password",element:<AuthPage mode="reset"/>},{path:"/auth/verify-email",element:<AuthPage mode="verify"/>},{path:"/auth/confirm-email-change",element:<AuthPage mode="email-change"/>},{path:"/auth/confirm-deletion",element:<AuthPage mode="delete"/>},
  {element:<RequireAccount/>,children:[{path:"/studio",element:<StudioPage/>},{path:"/studio/interview",element:<AutomatedInterviewPage/>},{path:"/studio/new",element:<IngestionPage/>},{path:"/studio/records/:id",element:<RecordEditorPage/>},{path:"/studio/claim/:recordId",element:<ClaimPage/>},{path:"/studio/claims",element:<ClaimsPage/>},{path:"/account/settings",element:<AccountSettingsPage/>},{path:"/director/accounts",element:<DirectorAccountsPage/>}]},{path:"*",element:<NotFoundPage/>},
]}]);
export function App(){return <RouterProvider router={router}/>}
