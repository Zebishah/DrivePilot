const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type BulkLessonPackage {
    lessons: Int!
    cost: Float!
  }

  type TeacherTariff {
    lessonFee: Float!
    bulkPackages: [BulkLessonPackage!]
    packageDiscount: Float
    lessonDiscount: Float
    PackageDiscountStartDate: String
    PackageDiscountEndDate: String
    discountStartDate: String
    discountEndDate: String
    isDefault: Boolean!
  }

  input BulkLessonPackageInput {
    lessons: Int!
    cost: Float!
  }

  input TeacherTariffInput {
    lessonFee: Float!
    bulkPackages: [BulkLessonPackageInput!]
    packageDiscount: Float
    lessonDiscount: Float
    PackageDiscountStartDate: String
    PackageDiscountEndDate: String
    discountStartDate: String
    discountEndDate: String
  }

  extend type Query {
    teacherTariff: TeacherTariff!
  }

  extend type Mutation {
    updateTeacherTariff(input: TeacherTariffInput!): TeacherTariff!
  }
`;

module.exports = typeDefs;
