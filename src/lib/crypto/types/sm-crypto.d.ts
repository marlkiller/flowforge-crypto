declare module "sm-crypto" {
  export const sm2: {
    generateKeyPairHex(): { privateKey: string; publicKey: string };
    compressPublicKeyHex(publicKey: string): string;
    comparePublicKeyHex(publicKey1: string, publicKey2: string): boolean;
    doEncrypt(data: string, publicKey: string, options?: { cipherMode?: number }): string;
    doDecrypt(data: string, privateKey: string): string;
    doSignature(
      data: string,
      privateKey: string,
      options?: { hash?: boolean; der?: boolean },
    ): string;
    doVerifySignature(
      data: string,
      signature: string,
      publicKey: string,
      options?: { hash?: boolean; der?: boolean },
    ): boolean;
    getPublicKeyFromPrivateKey(privateKey: string): string;
    getPoint(publicKey: string): any;
    verifyPublicKey(publicKey: string): boolean;
  };

  export const sm3: {
    (data: string | Uint8Array | number[], options?: { mode?: string; key?: string }): string;
  };

  export const sm4: {
    encrypt(
      data: string | Uint8Array | number[],
      key: string,
      options?: {
        mode?: string;
        iv?: string;
        padding?: string;
        output?: string;
      },
    ): string;
    decrypt(
      data: string,
      key: string,
      options?: {
        mode?: string;
        iv?: string;
        padding?: string;
        output?: string;
      },
    ): string | number[];
  };
}
