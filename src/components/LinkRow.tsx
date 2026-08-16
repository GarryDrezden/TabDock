import { useState } from "react";
import type { RuntimeTabInfo, StoredLink } from "../types/tabdock";
import { compactUrl, hostnameLetter } from "../utils/url";

type LinkRowProps = {
  link: StoredLink;
  runtime: RuntimeTabInfo;
  onOpen: (link: StoredLink) => Promise<void>;
};

export function LinkRow({ link, runtime, onOpen }: LinkRowProps) {
  const [brokenIcon, setBrokenIcon] = useState(false);
  const isOpen = runtime.isOpen;
  const showFavicon = Boolean(link.favIconUrl) && !brokenIcon;

  return (
    <button
      type="button"
      className={`link-row ${isOpen ? "is-open" : "is-closed"}`}
      onClick={() => {
        void onOpen(link);
      }}
      title={isOpen ? "Перейти к открытой вкладке" : "Открыть страницу"}
      aria-label={
        isOpen
          ? `${link.title}, открыта. Перейти к вкладке`
          : `${link.title}, закрыта. Открыть страницу`
      }
    >
      <span
        className={`status-dot ${isOpen ? "status-open" : "status-closed"}`}
        aria-hidden="true"
      />
      <span className="link-favicon" aria-hidden="true">
        {showFavicon ? (
          <img
            src={link.favIconUrl}
            alt=""
            width={16}
            height={16}
            onError={() => setBrokenIcon(true)}
          />
        ) : (
          <span className="favicon-fallback">{hostnameLetter(link.url)}</span>
        )}
      </span>
      <span className="link-text">
        <span className="link-title">{link.title}</span>
        <span className="link-url">{compactUrl(link.url)}</span>
      </span>
    </button>
  );
}
