import { gql } from "@apollo/client";
export const GET_TEACHER_TARIFF = gql`
  query GetTeacherTariff {
    teacherTariff {
      lessonFee
      lessonDiscount
      FinalPricePerLesson
      bulkPackages {
        title
        lessons
        packageDiscount
        PackageEndDate
        cost
        finalPackagePrice
        studentSave
      }
      isDefault
    }
  }
`;
export const UPDATE_TEACHER_TARIFF = gql`
  mutation UpdateTeacherTariff($input: TeacherTariffInput!) {
    updateTeacherTariff(input: $input) {
      lessonFee
      lessonDiscount
      FinalPricePerLesson
      bulkPackages {
        title
        lessons
        packageDiscount
        PackageEndDate
        cost
        finalPackagePrice
        studentSave
      }
      isDefault
    }
  }
`;
