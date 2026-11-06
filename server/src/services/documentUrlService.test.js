const test = require("node:test");
const assert = require("node:assert/strict");
const {
  SIGNED_DOWNLOAD_TTL_SECONDS,
  getStoredS3Key,
  getPrivateDocumentUrl,
} = require("./documentUrlService");

test("extracts keys only from the configured DSP S3 bucket", () => {
  const previousBucket = process.env.BUCKET_NAME;
  const previousRegion = process.env.AWS_REGION;
  process.env.BUCKET_NAME = "dsp-private-documents";
  process.env.AWS_REGION = "eu-central-1";

  try {
    assert.equal(
      getStoredS3Key(
        "https://dsp-private-documents.s3.eu-central-1.amazonaws.com/teachers/instructor-1/license.pdf",
      ),
      "teachers/instructor-1/license.pdf",
    );
    assert.equal(getStoredS3Key("https://example.com/public.pdf"), null);
  } finally {
    if (previousBucket === undefined) delete process.env.BUCKET_NAME;
    else process.env.BUCKET_NAME = previousBucket;
    if (previousRegion === undefined) delete process.env.AWS_REGION;
    else process.env.AWS_REGION = previousRegion;
  }
});

test("signs private document downloads without signing unrelated URLs", async () => {
  const previousBucket = process.env.BUCKET_NAME;
  const previousRegion = process.env.AWS_REGION;
  process.env.BUCKET_NAME = "dsp-private-documents";
  process.env.AWS_REGION = "eu-central-1";
  const calls = [];
  const s3Client = {
    getSignedUrlPromise: async (operation, params) => {
      calls.push({ operation, params });
      return "https://signed.example/document";
    },
  };

  try {
    assert.equal(
      await getPrivateDocumentUrl(
        "https://dsp-private-documents.s3.eu-central-1.amazonaws.com/students/student-1/id.png",
        { s3Client },
      ),
      "https://signed.example/document",
    );
    assert.deepEqual(calls, [
      {
        operation: "getObject",
        params: {
          Bucket: "dsp-private-documents",
          Key: "students/student-1/id.png",
          Expires: SIGNED_DOWNLOAD_TTL_SECONDS,
        },
      },
    ]);
    assert.equal(
      await getPrivateDocumentUrl("https://example.com/public.pdf", { s3Client }),
      "https://example.com/public.pdf",
    );
  } finally {
    if (previousBucket === undefined) delete process.env.BUCKET_NAME;
    else process.env.BUCKET_NAME = previousBucket;
    if (previousRegion === undefined) delete process.env.AWS_REGION;
    else process.env.AWS_REGION = previousRegion;
  }
});
