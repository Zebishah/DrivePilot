const test = require("node:test");
const assert = require("node:assert/strict");
process.env.STRIPE_SECRET_KEY ||= "sk_test_upload_url_test";
const s3 = require("../config/awsConfig");
const resolvers = require("./resolvers");

test("generateUploadUrl signs valid uploads without ContentLength", async () => {
  const previousBucket = process.env.BUCKET_NAME;
  const previousRegion = process.env.AWS_REGION;
  const previousSigner = s3.getSignedUrlPromise;
  const calls = [];
  process.env.BUCKET_NAME = "dsp-private-documents";
  process.env.AWS_REGION = "eu-central-1";
  s3.getSignedUrlPromise = async (operation, params) => {
    calls.push({ operation, params });
    return "https://signed.example/upload";
  };

  try {
    const result = await resolvers.Mutation.generateUploadUrl(
      null,
      {
        userId: "student-1",
        role: "Student",
        fileName: "license.pdf",
        fileType: "application/pdf",
        fileSize: 1024,
      },
      { user: { id: "student-1", role: "Student" } },
    );

    assert.equal(result.uploadUrl, "https://signed.example/upload");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].operation, "putObject");
    assert.equal(calls[0].params.ContentType, "application/pdf");
    assert.equal(Object.hasOwn(calls[0].params, "ContentLength"), false);
  } finally {
    s3.getSignedUrlPromise = previousSigner;
    if (previousBucket === undefined) delete process.env.BUCKET_NAME;
    else process.env.BUCKET_NAME = previousBucket;
    if (previousRegion === undefined) delete process.env.AWS_REGION;
    else process.env.AWS_REGION = previousRegion;
  }
});

test("generateUploadUrl rejects oversized and unsupported files before signing", async () => {
  const previousSigner = s3.getSignedUrlPromise;
  let signingAttempts = 0;
  s3.getSignedUrlPromise = async () => {
    signingAttempts += 1;
    return "https://signed.example/upload";
  };
  const args = {
    userId: "student-1",
    role: "Student",
    fileName: "document.pdf",
    fileType: "application/pdf",
    fileSize: 1024,
  };
  const context = { user: { id: "student-1", role: "Student" } };

  try {
    await assert.rejects(
      () => resolvers.Mutation.generateUploadUrl(null, { ...args, fileSize: 10 * 1024 * 1024 + 1 }, context),
      /10 MB/,
    );
    await assert.rejects(
      () => resolvers.Mutation.generateUploadUrl(null, { ...args, fileType: "application/x-msdownload" }, context),
      /PDF, JPEG, PNG, and WebP/,
    );
    assert.equal(signingAttempts, 0);
  } finally {
    s3.getSignedUrlPromise = previousSigner;
  }
});
