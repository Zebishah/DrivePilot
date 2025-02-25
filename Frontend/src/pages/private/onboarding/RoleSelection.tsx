import React from 'react';
import { Box, Typography, Button, Container, useTheme } from '@mui/material';
import { User, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from '../../../components/Logo';
import { useMutation } from '@apollo/client';
import { SELECT_ROLE_MUTATION } from '../../../graphql/mutations/auth';
import { useAuth } from '../../../context/AuthContext';
import { UserRole } from '../../../types/auth';

interface RoleCardProps {
    title: string;
    imageSrc: string;
    selected: boolean;
    onClick: () => void;
}


const RoleCard: React.FC<RoleCardProps> = ({ title, imageSrc, selected, onClick }) => {
    const theme = useTheme();
    return (
        <Box
            sx={{
                position: 'relative',
                width: { xs: '100%', sm: '45%' },
                mx: 'auto',
                mb: 4,
                cursor: 'pointer',
            }}
            onClick={onClick}
        >
            <Box
                sx={{
                    width: 200,
                    height: 200,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    border: selected
                        ? `4px solid ${theme.palette.primary.main}`
                        : '4px solid transparent',
                    transition: 'border-color 0.3s',
                    '&:hover': {
                        borderColor: theme.palette.primary.main,
                    },
                }}
            >
                <img
                    src={imageSrc}
                    alt={title}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '50%',
                    }}
                />
            </Box>
            <Typography
                variant="h6"
                component="h2"
                sx={{
                    mt: 2,
                    textAlign: 'center',
                    color: selected ? theme.palette.primary.main : 'inherit',
                    fontWeight: selected ? 'bold' : 'normal',
                }}
            >
                {title}
            </Typography>
            {selected && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        backgroundColor: theme.palette.primary.main,
                        color: '#fff',
                        borderRadius: '50%',
                        width: 30,
                        height: 30,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    ✓
                </Box>
            )}
        </Box>
    );
};

const RoleSelection: React.FC = () => {
    const [selectedRole, setSelectedRole] = React.useState<'student' | 'instructor' | null>(null);
    const navigate = useNavigate();
    const { login } = useAuth();

    const [selectRole, { loading }] = useMutation(SELECT_ROLE_MUTATION, {
        onCompleted: (data) => {
            // Update auth context with new token and user data
            login(data.selectRole);

            if (data.selectRole.user.role === UserRole.Student) {
                navigate('/onboarding/student-profile');
            } else if (data.selectRole.user.role === UserRole.Instructor) {
                navigate('/onboarding/instructor-profile');
            }
        },
        onError: (error) => {
            console.error('Role selection error:', error);
            // You might want to add a Snackbar or Alert component here to show the error
        }
    });

    const handleContinue = async () => {
        if (!selectedRole) return;

        try {
            await selectRole({
                variables: {
                    role: selectedRole === 'student' ? UserRole.Student : UserRole.Instructor
                }
            });
        } catch (err) {
            // Error will be handled by onError callback
            console.error('Error selecting role:', err);
        }
    };

    return (
        <Container maxWidth="sm">
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    mb: 12,
                    mt: 4,
                    gap: 6
                }}
            >
                <Logo />
                <Typography color='#00000080' variant="h6" component="h1" gutterBottom>
                    Are you Student or Instructor
                </Typography>
            </Box>

            <Box
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: 'center',
                    justifyContent: 'space-around',
                    mb: 4,
                }}
            >
                <RoleCard
                    title="Learner"
                    imageSrc="/onboarding/learner-img.png"
                    selected={selectedRole === 'student'}
                    onClick={() => setSelectedRole('student')}
                />
                <RoleCard
                    title="Instructor"
                    imageSrc="/onboarding/instructor-img.png"
                    selected={selectedRole === 'instructor'}
                    onClick={() => setSelectedRole('instructor')}
                />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                    variant="contained"
                    size="large"
                    disabled={!selectedRole || loading}
                    onClick={handleContinue}
                    sx={{
                        minWidth: 300,
                        bgcolor: '#5CD2D9',
                        '&:hover': {
                            bgcolor: '#4CB8BF'
                        }
                    }}
                >
                    {loading ? 'Selecting...' : 'Select'}
                </Button>
            </Box>
        </Container>
    );
};

export default RoleSelection;
