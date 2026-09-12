const { Student, User } = require("../../models/User");
const { AuthenticationError } = require("apollo-server-express");
const { updateStudentProfileSchema } = require("../../schemas/validation");
const { Mutation } = require("../resolvers");
const studentBookingModel = require("../../models/studentBooking.model");
const StudentBooking = require("../../models/studentBooking.model");
const {
  requireStudentOwnership,
  requireStudentDataAccess,
  requireRole,
} = require("../../utils/authorization");
const studentResolver = {
  Query: {
    studentProfile: async (_, __, { user }) => {
      if (!user) {
        throw new AuthenticationError("Not authenticated");
      }

      try {
        const student = await Student.findById(user.id);

        // Check if the field exists but under a different name
        const studentObj = student.toObject ? student.toObject() : student;

        // Try to find any field that might contain profile image URL
        const possibleImageFields = Object.keys(studentObj).filter(
          (key) =>
            typeof studentObj[key] === "string" &&
            (key.toLowerCase().includes("image") ||
              key.toLowerCase().includes("photo") ||
              key.toLowerCase().includes("avatar") ||
              key.toLowerCase().includes("picture")),
        );

        if (!student) {
          return null;
        }

        return {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          phone: student.phone,
          location: student.location,
          description: student.description,
          homeAddress: student.homeAddress,
          zipCode: student.zipCode,
          fatherName: student.fatherName,
          dateOfBirth: student.dateOfBirth,
          profileImage:
            student.profileImage || student.avatar || student.photo || null, // Try alternative field names
          documents: student.documents,
          languagePreference: student.languagePreference,
        };
      } catch (error) {
        console.error("Error fetching student profile:", error);
        throw new Error("Failed to fetch student profile");
      }
    },
    getStudentLessonHours: async (_, { studentId }, { user }) => {
      await requireStudentDataAccess(user, studentId);
      const student = await Student.findById(studentId).select(
        "firstName lastName lessonHoursLeft",
      );

      if (!student) {
        throw new Error("Student not found");
      }

      return {
        studentId: student._id.toString(),
        name: `${student.firstName} ${student.lastName}`,
        lessonHoursLeft: student.lessonHoursLeft || "",
      };
    },
    getStudentLessons: async (_, { studentId }, { user }) => {
      requireStudentOwnership(user, studentId);
      try {
        return await studentBookingModel.find({ studentId });
      } catch (error) {
        throw new Error(`Error fetching student lessons: ${error.message}`);
      }
    },

    getStudentLessonHistory: async (_, { studentId }, { user }) => {
      requireStudentOwnership(user, studentId);
      try {
        // ✅ Populate instructor fields
        const bookings = await studentBookingModel
          .find({ studentId })
          .populate("instructorId", "firstName lastName");

        const lessons = [];

        bookings.forEach((booking) => {
          booking.slots.forEach((slot, slotIndex) => {
            const bookingDate = new Date(booking.createdAt)
              .toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
              .replace(/\//g, "-");

            const endDate = slot.date.split("-").reverse().join("-");

            const paymentPerSlot = booking.totalAmount;
            const finalPrice = Math.round(booking.finalAmount);
            let status = slot.status;
            if (slot.status === "available") {
              status = booking.status;
            }

            const statusDisplay =
              status.charAt(0).toUpperCase() + status.slice(1);

            lessons.push({
              lessonBooked: `Lesson ${booking._id.toString().substr(-4)}-${slotIndex + 1}`,
              bookingDate: bookingDate,
              payment: Math.round(paymentPerSlot),
              status: statusDisplay,
              endDate: endDate,
              startTime: slot.startTime,
              endTime: slot.endTime,
              slotStatus: slot.status,
              FinalPrice: Math.round(finalPrice),
              bookingStatus: booking.status,
              instructorName: booking.instructorId
                ? `${booking.instructorId.firstName} ${booking.instructorId.lastName}`
                : "Unknown Instructor",
              instructorId:
                booking.instructorId?._id?.toString() ??
                booking.instructorId?.toString() ??
                null,
              slotId: slot._id,
              bookingId: booking._id,
            });
          });
        });

        lessons.sort(
          (a, b) =>
            new Date(b.bookingDate.split("-").reverse().join("-")) -
            new Date(a.bookingDate.split("-").reverse().join("-")),
        );

        return lessons;
      } catch (error) {
        throw new Error(`Error fetching lesson history: ${error.message}`);
      }
    },
    getStudentProgress: async (_, { studentId }, { user }) => {
      await requireStudentDataAccess(user, studentId);

      try {
        // Fetch student details
        const student = await Student.findById(studentId);
        if (!student) {
          throw new Error("Student not found");
        }

        const now = new Date();

        // Fetch all bookings for this student
        const allBookings = await StudentBooking.find({
          studentId: studentId,
          status: "confirmed",
        })
          .populate(
            "instructorId",
            "_id firstName lastName email description profileImage",
          )
          .populate("studentId", "_id firstName lastName email profileImage")
          .sort({ createdAt: -1 });

        // Separate completed and uncompleted bookings
        const completedBookings = [];
        const uncompletedBookings = [];

        allBookings.forEach((booking) => {
          if (!booking.slots || booking.slots.length === 0) {
            uncompletedBookings.push(booking);
            return;
          }

          // Get the latest slot by end time
          const lastSlot = booking.slots.reduce((latest, current) => {
            const latestEnd = new Date(`${latest.date}T${latest.endTime}:00`);
            const currentEnd = new Date(
              `${current.date}T${current.endTime}:00`,
            );
            return currentEnd > latestEnd ? current : latest;
          });

          const lastEndDateTime = new Date(
            `${lastSlot.date}T${lastSlot.endTime}:00`,
          );

          if (lastEndDateTime <= now) {
            completedBookings.push(booking);
          } else {
            uncompletedBookings.push(booking);
          }
        });

        // Calculate statistics
        const totalBookedLessons = allBookings.length;

        // Calculate total lesson hours across all bookings
        const totalLessonHours = allBookings.reduce((total, booking) => {
          const bookingHours = booking.slots.reduce((slotTotal, slot) => {
            const startTime = new Date(`2000-01-01T${slot.startTime}:00`);
            const endTime = new Date(`2000-01-01T${slot.endTime}:00`);
            const hoursDiff = (endTime - startTime) / (1000 * 60 * 60);
            return slotTotal + hoursDiff;
          }, 0);
          return total + bookingHours;
        }, 0);

        // Create chart data for lessons booked by date
        const chartData = {};
        allBookings.forEach((booking) => {
          booking.slots.forEach((slot) => {
            const date = slot.date;
            if (chartData[date]) {
              chartData[date]++;
            } else {
              chartData[date] = 1;
            }
          });
        });

        // Convert chart data to array format
        const lessonsChartData = Object.entries(chartData)
          .map(([date, count]) => ({
            date,
            lessons: count,
          }))
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        // Format bookings with additional info
        const formatBookings = (bookings) => {
          return bookings.map((booking) => {
            const bookingObj = booking.toObject();

            // Calculate total hours for this booking
            const totalHours = booking.slots.reduce((total, slot) => {
              const startTime = new Date(`2000-01-01T${slot.startTime}:00`);
              const endTime = new Date(`2000-01-01T${slot.endTime}:00`);
              const hoursDiff = (endTime - startTime) / (1000 * 60 * 60);
              return total + hoursDiff;
            }, 0);

            return {
              ...bookingObj,
              totalHours: Math.round(totalHours * 100) / 100, // Round to 2 decimal places
              bookerProfileImage: booking.studentId?.profileImage || "",
              instructorId: {
                ...bookingObj.instructorId,
                profileImage: booking.instructorId?.profileImage || "",
              },
            };
          });
        };

        return {
          student: {
            _id: student._id,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            profileImage: student.profileImage,
            location: student.location,
            description: student.description,
          },
          statistics: {
            totalBookedLessons,
            totalLessonHours: Math.round(totalLessonHours * 100) / 100,
            completedLessons: completedBookings.length,
            upcomingLessons: uncompletedBookings.length,
          },
          chartData: lessonsChartData,
          bookings: {
            completed: formatBookings(completedBookings),
            upcoming: formatBookings(uncompletedBookings),
          },
        };
      } catch (error) {
        console.error("Error fetching student progress:", error);
        throw new Error("Failed to fetch student progress");
      }
    },

    getAllStudents: async (_, { filter }, { user }) => {
      requireRole(user, "Instructor");
      try {
        const confirmedBookings = await StudentBooking.find({
          instructorId: user?.id,
          status: { $in: ["confirmed", "semi_cancelled", "completed"] },
        }).select("studentId");

        const studentIdsWithConfirmedBookings = [
          ...new Set(confirmedBookings.map((b) => b.studentId.toString())),
        ];

        // Step 2: Prepare query to fetch only students with those IDs
        let query = {
          role: "Student",
          _id: { $in: studentIdsWithConfirmedBookings },
        };
        // Apply filters
        if (filter) {
          if (filter.isProfileComplete !== undefined) {
            query.isProfileComplete = filter.isProfileComplete;
          }
          if (filter.isUserVerified !== undefined) {
            query.isUserVerified = filter.isUserVerified;
          }
          if (filter.authProvider) {
            query.authProvider = filter.authProvider;
          }
          if (filter.location) {
            query.location = { $regex: filter.location, $options: "i" };
          }
        }

        let students = await User.find(query).lean();

        // Attach lesson stats and booking details for each student
        const now = new Date();
        const enrichedStudents = await Promise.all(
          students.map(async (student) => {
            const bookings = await StudentBooking.find({
              studentId: student._id,
              instructorId: user?.id,
              status: { $in: ["confirmed", "semi_cancelled", "completed"] },
            })
              .populate(
                "instructorId",
                "_id firstName lastName email profileImage",
              )
              .lean();

            let totalLessonCount = 0;
            let totalDurationMinutes = 0;
            let remainingDurationMinutes = 0;

            const completedBookings = [];
            const uncompletedBookings = [];

            for (const booking of bookings) {
              if (!booking.slots || booking.slots.length === 0) continue;

              const finalBooking = {
                ...booking,
                instructorId: {
                  ...booking.instructorId,
                  profileImage: booking.instructorId?.profileImage || "",
                },
              };

              let latestEnd = null;

              for (const slot of booking.slots) {
                totalLessonCount += 1;
                const start = new Date(`${slot.date}T${slot.startTime}:00`);
                const end = new Date(`${slot.date}T${slot.endTime}:00`);
                const duration = (end - start) / (1000 * 60); // in minutes
                totalDurationMinutes += duration;

                if (end > now) {
                  // Slot is ongoing or upcoming
                  if (now < start) {
                    // Entire slot is remaining
                    remainingDurationMinutes += duration;
                  } else {
                    // Partially remaining
                    remainingDurationMinutes += (end - now) / (1000 * 60);
                  }
                }

                if (!latestEnd || end > latestEnd) {
                  latestEnd = end;
                }
              }

              if (latestEnd && latestEnd <= now) {
                completedBookings.push(finalBooking);
              } else {
                uncompletedBookings.push(finalBooking);
              }
            }

            return {
              ...student,
              lessonStats: {
                totalLessons: totalLessonCount,
                totalLessonDurationInMinutes: totalDurationMinutes,
                remainingLessonDurationInMinutes: Math.round(
                  remainingDurationMinutes,
                ),
              },
            };
          }),
        );

        // Apply sorting
        if (filter?.sortBy) {
          switch (filter.sortBy) {
            case "RECENT_TO_OLDEST":
              enrichedStudents.sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
              );
              break;
            case "OLDEST_TO_RECENT":
              enrichedStudents.sort(
                (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
              );
              break;
            case "A_TO_Z_ORDER":
              enrichedStudents.sort((a, b) =>
                `${a.firstName} ${a.lastName}`.localeCompare(
                  `${b.firstName} ${b.lastName}`,
                ),
              );
              break;
            case "Z_TO_A_ORDER":
              enrichedStudents.sort((a, b) =>
                `${b.firstName} ${b.lastName}`.localeCompare(
                  `${a.firstName} ${a.lastName}`,
                ),
              );
              break;
            case "REMAINING_HOURS":
              enrichedStudents.sort(
                (a, b) => (b.remainingHours || 0) - (a.remainingHours || 0),
              );
              break;
            default:
              break;
          }
        }

        return enrichedStudents;
      } catch (error) {
        throw new Error(`Error fetching students: ${error.message}`);
      }
    },
  },
  Mutation: {
    updateStudentProfile: async (_, { input }, { user }) => {
      if (!user) throw new Error("Not authenticated");

      try {
        // Validate input
        const validatedInput = updateStudentProfileSchema.parse(input);

        // Remove any undefined or null values from input
        const cleanInput = Object.entries(validatedInput).reduce(
          (acc, [key, value]) => {
            if (value !== undefined && value !== null) {
              acc[key] = value;
            }
            return acc;
          },
          {},
        );

        // Handle special case for languagePreference to ensure it's always an array
        if (cleanInput.languagePreference !== undefined) {
          // If languagePreference is a string, convert it to an array
          if (typeof cleanInput.languagePreference === "string") {
            cleanInput.languagePreference = [cleanInput.languagePreference];
          }
          // If languagePreference is empty or null, set it to an empty array
          if (
            !cleanInput.languagePreference ||
            cleanInput.languagePreference.length === 0
          ) {
            cleanInput.languagePreference = [];
          }
        }

        // Only allow updating instructor-specific fields
        const allowedFields = [
          "homeAddress",
          "firstName",
          "lastName",
          "location",
          "zipCode",
          "documents",
          "description",
          "phone",
          "fatherName",
          "dateOfBirth",
          "profileImage",
          "languagePreference",
        ];

        const filteredInput = Object.entries(cleanInput).reduce(
          (acc, [key, value]) => {
            if (allowedFields.includes(key)) {
              acc[key] = value;
            }
            return acc;
          },
          {},
        );

        // First check if the instructor exists
        const existingStudent = await Student.findById(user.id);
        if (!existingStudent) {
          throw new Error("Instructor not found");
        }

        // Update the instructor profile
        const instructor = await Student.findByIdAndUpdate(
          user.id,
          { $set: filteredInput },
          { new: true, runValidators: true },
        );

        if (!instructor) {
          throw new Error("Failed to update Student profile");
        }

        // Return only the fields that are defined in the InstructorProfile type
        return {
          id: instructor.id,
          firstName: instructor.firstName,
          lastName: instructor.lastName,
          email: instructor.email,
          location: instructor.location,
          homeAddress: instructor.homeAddress,
          zipCode: instructor.zipCode,
          documents: instructor.documents,
          description: instructor.description,
          phone: instructor.phone,
          fatherName: instructor.fatherName,
          dateOfBirth: instructor.dateOfBirth,
          languagePreference: instructor.languagePreference,
          profileImage: instructor.profileImage,
        };
      } catch (error) {
        if (error.name === "ValidationError") {
          const validationErrors = Object.values(error.errors).map(
            (err) => err.message,
          );
          throw new Error(`Validation error: ${validationErrors.join(", ")}`);
        }
        if (error.name === "CastError") {
          throw new Error(`Invalid data format: ${error.message}`);
        }
        if (error.name === "ZodError") {
          throw new Error(
            `Validation error: ${error.errors
              .map((err) => err.message)
              .join(", ")}`,
          );
        }
        throw new Error(`Error updating student profile: ${error.message}`);
      }
    },
  },
};

module.exports = studentResolver;
