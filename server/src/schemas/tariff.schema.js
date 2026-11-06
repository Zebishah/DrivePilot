const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type BulkLessonPackage {
    title: String
    lessons: Int
    cost: Float
    costMinor: Int
    packageDiscount: Float
    PackageEndDate: String
    finalPackagePrice: Float
    finalPackagePriceMinor: Int
    studentSave: Float
  }

  type TeacherTariff {
    lessonFee: Float
    lessonFeeMinor: Int
    bulkPackages: [BulkLessonPackage!]
    lessonDiscount: Float
    FinalPricePerLesson: Float
    FinalPricePerLessonMinor: Int
    isDefault: Boolean
  }

  input BulkLessonPackageInput {
    title: String!
    lessons: Int!
    cost: Float!
    packageDiscount: Float!
    PackageEndDate: String
    finalPackagePrice: Float!
    studentSave: Float!
  }

  input TeacherTariffInput {
    lessonFee: Float!
    bulkPackages: [BulkLessonPackageInput!]
    lessonDiscount: Float
    FinalPricePerLesson: Float
    isDefault: Boolean
  }

  extend type Query {
    teacherTariff: TeacherTariff!
  }

  extend type Mutation {
    updateTeacherTariff(input: TeacherTariffInput!): TeacherTariff!
  }
`;

module.exports = typeDefs;
