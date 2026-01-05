declare module "qrcode" {
  interface QRCodeCanvas {
    getContext: (contextId: string) => unknown;
  }

  type QRCodeColor = {
    dark?: string;
    light?: string;
  };

  type QRCodeRendererOptions = {
    quality?: number;
  };

  type QRCodeOptionsBase = {
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    width?: number;
    version?: number;
    margin?: number;
    scale?: number;
    color?: QRCodeColor;
    rendererOpts?: QRCodeRendererOptions;
  };

  type QRCodeOptions = QRCodeOptionsBase & {
    type?: "image/png" | "image/jpeg" | "image/webp";
  };

  type QRCodeStringOptions = QRCodeOptionsBase & {
    type?: "terminal" | "utf8" | "svg";
    small?: boolean;
  };

  type QRCodeToDataURLCallback = (error: Error | null, url: string) => void;
  type QRCodeToCanvasCallback = (
    error: Error | null,
    canvas: QRCodeCanvas,
  ) => void;
  type QRCodeToStringCallback = (error: Error | null, string: string) => void;

  type QRCodeModuleData = {
    size: number;
    data: ArrayLike<number | boolean>;
  };

  const QRCode: {
    create(
      text: string,
      options?: QRCodeOptionsBase,
    ): {
      modules: QRCodeModuleData;
      version: number;
      errorCorrectionLevel: "L" | "M" | "Q" | "H";
      maskPattern: number;
      segments: Array<{
        data: string | Uint8Array | ArrayBuffer;
        mode: "numeric" | "alphanumeric" | "byte" | "kanji";
      }>;
    };
    toDataURL(text: string, options?: QRCodeOptions): Promise<string>;
    toDataURL(text: string, callback: QRCodeToDataURLCallback): Promise<string>;
    toDataURL(
      text: string,
      options: QRCodeOptions,
      callback: QRCodeToDataURLCallback,
    ): Promise<string>;
    toDataURL(
      canvas: QRCodeCanvas,
      text: string,
      options?: QRCodeOptions,
    ): Promise<string>;
    toDataURL(
      canvas: QRCodeCanvas,
      text: string,
      callback: QRCodeToDataURLCallback,
    ): Promise<string>;
    toDataURL(
      canvas: QRCodeCanvas,
      text: string,
      options: QRCodeOptions,
      callback: QRCodeToDataURLCallback,
    ): Promise<string>;
    toCanvas(text: string, options?: QRCodeOptions): Promise<QRCodeCanvas>;
    toCanvas(
      text: string,
      callback: QRCodeToCanvasCallback,
    ): Promise<QRCodeCanvas>;
    toCanvas(
      text: string,
      options: QRCodeOptions,
      callback: QRCodeToCanvasCallback,
    ): Promise<QRCodeCanvas>;
    toCanvas(
      canvas: QRCodeCanvas,
      text: string,
      options?: QRCodeOptions,
    ): Promise<QRCodeCanvas>;
    toCanvas(
      canvas: QRCodeCanvas,
      text: string,
      callback: QRCodeToCanvasCallback,
    ): Promise<QRCodeCanvas>;
    toCanvas(
      canvas: QRCodeCanvas,
      text: string,
      options: QRCodeOptions,
      callback: QRCodeToCanvasCallback,
    ): Promise<QRCodeCanvas>;
    toString(text: string, options?: QRCodeStringOptions): Promise<string>;
    toString(text: string, callback: QRCodeToStringCallback): Promise<string>;
    toString(
      text: string,
      options: QRCodeStringOptions,
      callback: QRCodeToStringCallback,
    ): Promise<string>;
  };

  export default QRCode;
}
