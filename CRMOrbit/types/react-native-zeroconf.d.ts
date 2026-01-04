declare module "react-native-zeroconf" {
  type ZeroconfService = {
    name?: string;
    txt?: Record<string, string | undefined>;
    addresses?: string[];
    port?: number;
  };

  export default class Zeroconf {
    on(
      event: "resolved" | "remove",
      handler: (service: ZeroconfService) => void,
    ): void;
    on(event: "error", handler: (error: unknown) => void): void;
    publishService(
      type: string,
      protocol: "tcp" | "udp",
      domain: string,
      name: string,
      port: number,
      txt: Record<string, string | undefined>,
    ): void;
    unpublishService(type: string, protocol: "tcp" | "udp"): void;
    scan(type: string, protocol: "tcp" | "udp", domain: string): void;
    stop(): void;
  }
}
