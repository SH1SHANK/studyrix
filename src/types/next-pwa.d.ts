declare module "next-pwa" {
  import type { NextConfig } from "next";

  type NextPwaPlugin = (config: NextConfig) => NextConfig;
  type NextPwaFactory = (options: Record<string, unknown>) => NextPwaPlugin;

  const withPWAInit: NextPwaFactory;
  export default withPWAInit;
}
