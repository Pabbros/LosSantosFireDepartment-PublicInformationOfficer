export function isTrustedMutation(request: Request) {
  if (request.headers.get("x-cms-request") !== "same-origin") return false;
  const fetchSite = request.headers.get("sec-fetch-site");
  return fetchSite === null || fetchSite === "same-origin";
}
