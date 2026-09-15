import React, { useEffect, useState } from "react";
import AssistantPage from "./pages/AssistantPage";
import EventDetailPage from "./pages/EventDetailPage";
import EventFeedPage from "./pages/EventFeedPage";
import PipelinePage from "./pages/PipelinePage";
import SearchPage from "./pages/SearchPage";
import SourcesPage from "./pages/SourcesPage";

const routes = [
  { matches: (path) => path === "/", Page: EventFeedPage },
  { matches: (path) => path.startsWith("/events/"), Page: EventDetailPage },
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
  const Page = route?.Page ?? EventFeedPage;

  return <Page key={currentUrl} />;
}
