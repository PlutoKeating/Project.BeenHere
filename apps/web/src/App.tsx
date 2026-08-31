import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AdminPage } from "./pages/AdminPage";
import { ArchivePage } from "./pages/ArchivePage";
import { ArchivesPage } from "./pages/ArchivesPage";
import { CorrectionsPage } from "./pages/CorrectionsPage";
import { DriftPage } from "./pages/DriftPage";
import { HomePage } from "./pages/HomePage";
import { MethodPage } from "./pages/MethodPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PersonPage } from "./pages/PersonPage";
import { SearchPage } from "./pages/SearchPage";
import { TopicPage } from "./pages/TopicPage";
import { YearPage } from "./pages/YearPage";

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/archives", element: <ArchivesPage /> },
      { path: "/archives/:archiveNumber", element: <ArchivePage /> },
      { path: "/drift", element: <DriftPage /> },
      { path: "/search", element: <SearchPage /> },
      { path: "/people/:slug", element: <PersonPage /> },
      { path: "/topics/:slug", element: <TopicPage /> },
      { path: "/years/:year", element: <YearPage /> },
      { path: "/method", element: <MethodPage /> },
      { path: "/corrections", element: <CorrectionsPage /> },
      { path: "/admin", element: <AdminPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
