import React, { useEffect, useState } from "react";
import AnalysisPage from "./pages/AnalysisPage";
import AssistantPage from "./pages/AssistantPage";
import EntitiesPage from "./pages/EntitiesPage";
import EventDetailPage from "./pages/EventDetailPage";
import EventFeedPage from "./pages/EventFeedPage";
import OverviewPage from "./pages/OverviewPage";
import PipelinePage from "./pages/PipelinePage";
import SearchPage from "./pages/SearchPage";
import SourcesPage from "./pages/SourcesPage";

const routes = [
  { matches: (path) => path === "/", Page: OverviewPage },
  { matches: (path) => path === "/events", Page: EventFeedPage },
  { matches: (path) => path.startsWith("/events/"), Page: EventDetailPage },
  { matches: (path) => path === "/analysis", Page: AnalysisPage },
  { matches: (path) => path === "/entities", Page: EntitiesPage },
  { matches: (path) => path === "/search", Page: SearchPage },
  { matches: (path) => path === "/assistant", Page: AssistantPage },
  { matches: (path) => path === "/sources", Page: SourcesPage },
  { matches: (path) => path === "/pipeline", Page: PipelinePage },
];

export default function App() {
  const [currentUrl, setCurrentUrl] = useState(
    () => window.location.pathname + window.location.search
  );

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentUrl(window.location.pathname + window.location.search);
      window.scrollTo(0, 0);
    };

    window.addEventListener("popstate", handleLocationChange);
    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  const pathname = window.location.pathname;
  const route = routes.find(({ matches }) => matches(pathname));
  const Page = route?.Page ?? OverviewPage;

  return <Page key={currentUrl} />;
}
