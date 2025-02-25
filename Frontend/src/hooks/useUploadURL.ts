import { useMutation } from "@apollo/client";
import { GENERATE_UPLOAD_URL } from "../graphql/mutations/auth";

interface UploadResponse {
  success: boolean;
  fileUrl?: string;
  message?: string;
}

export const useFileUpload = () => {
  const [generateUploadUrl, { loading }] = useMutation(GENERATE_UPLOAD_URL);

  const uploadFile = async (
    file: File,
    userId: string | undefined,
    role: string | undefined
  ): Promise<UploadResponse> => {
    if (!file) return { success: false, message: "No file selected" };

    try {
      // Step 1: Get pre-signed URL from backend
      const { data } = await generateUploadUrl({
        variables: {
          userId,
          role,
          fileName: file.name,
          fileType: file.type,
        },
      });

      if (!data?.generateUploadUrl?.uploadUrl) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl, fileUrl } = data.generateUploadUrl;
      console.log(uploadUrl, fileUrl);

      // Step 2: Upload the file to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      console.log("upload", uploadResponse);

      if (!uploadResponse.ok) {
        throw new Error("File upload failed");
      }
      return { success: true, fileUrl };
    } catch (error) {
      console.error("Upload error:", error);
      return { success: false, message: (error as Error).message };
    }
  };

  return { uploadFile, isUploading: loading };
};
