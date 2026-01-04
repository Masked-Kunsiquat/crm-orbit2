declare module "qrcode" {
  type QRCodeOptions = {
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    type?: string;
    width?: number;
  };

  const QRCode: {
    toDataURL: (text: string, options?: QRCodeOptions) => Promise<string>;
  };

  export default QRCode;
}
