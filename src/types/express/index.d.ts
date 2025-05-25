// src/types/express/index.d.ts

import { File } from "multer";

declare global {
  namespace Express {
    export interface Request {
      file?: File;

      files?:
        | {
            [fieldname: string]: File[];
          }
        | File[];
      query: {
        [key: string]: string | string[] | undefined;
      };

      body: {
        email?: string;
        oldEmail?: string;
        newEmail?: string;
        name?: string;
        senha?: string;
        currentPassword?: string;
        newPassword?: string;
        profilePhotoUrl?: string;
        [key: string]: any;
      };
    }
  }
}
