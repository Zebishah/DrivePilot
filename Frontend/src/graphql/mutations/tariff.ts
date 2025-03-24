import { gql } from "@apollo/client";

export const GET_TEACHER_TARIFF = gql`
  query GetTeacherTariff {
    teacherTariff {
      lessonFee
      bulkPackages {
        lessons
        cost
      }
      packageDiscount
      discountStartDate
      discountEndDate
      isDefault
    }
  }
`;

export const UPDATE_TEACHER_TARIFF = gql`
  mutation UpdateTeacherTariff($input: TeacherTariffInput!) {
    updateTeacherTariff(input: $input) {
      lessonFee
      bulkPackages {
        lessons
        cost
      }
      packageDiscount
      discountStartDate
      discountEndDate
      isDefault
    }
  }
`; 