import { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = absoluteUrl("");

  const routes = [
    "",
    "/offline",
    "/downloads",
    "/settings",
    "/launchpad",
    "/privacy",
    "/resources",
    "/resources/offline",
    "/resources/settings",
    "/resources/downloads",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  return [...routes];
}
