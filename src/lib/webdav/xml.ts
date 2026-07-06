function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type PropfindEntry = {
  href: string;
  displayName: string;
  isCollection: boolean;
  size?: number;
  mime?: string;
  lastModified?: Date;
};

/** Build a WebDAV 207 Multi-Status body from a list of resources. */
export function multistatus(entries: PropfindEntry[]): string {
  const responses = entries
    .map((e) => {
      const resourcetype = e.isCollection
        ? "<D:resourcetype><D:collection/></D:resourcetype>"
        : "<D:resourcetype/>";
      const fileProps = e.isCollection
        ? ""
        : `<D:getcontentlength>${e.size ?? 0}</D:getcontentlength>` +
          `<D:getcontenttype>${esc(e.mime ?? "application/octet-stream")}</D:getcontenttype>`;
      const lastModified = (e.lastModified ?? new Date(0)).toUTCString();
      return (
        `<D:response><D:href>${esc(e.href)}</D:href>` +
        `<D:propstat><D:prop>` +
        `<D:displayname>${esc(e.displayName)}</D:displayname>` +
        `${resourcetype}${fileProps}` +
        `<D:getlastmodified>${lastModified}</D:getlastmodified>` +
        `</D:prop><D:status>HTTP/1.1 200 OK</D:status></D:propstat></D:response>`
      );
    })
    .join("");
  return `<?xml version="1.0" encoding="utf-8"?>\n<D:multistatus xmlns:D="DAV:">${responses}</D:multistatus>`;
}
