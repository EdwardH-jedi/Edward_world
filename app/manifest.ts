import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Edward's World",
    short_name: "Edward's World",
    description: "An interactive developer portfolio by Edward Hwang.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f2ec",
    theme_color: "#f4f2ec",
  };
}
