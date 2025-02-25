import React from 'react';
import { Box, Card, CardContent,ListItemIcon,Typography } from '@mui/material';
import {  List, ListItem } from '@mui/material';
import CircleIcon from '@mui/icons-material/Circle';
import { FaRegCheckCircle } from 'react-icons/fa';
const Summary: React.FC = () => {
  return (
    <div>
    
    <Card sx={{ marginTop: 2,
        
        height: { xs: 'auto', md: 650 },
        borderRadius: "10px",
        marginBottom:"1rem",
        boxShadow:2,
     }}>
          <CardContent>
            <Typography 
            sx={{
                fontWeight:"600",
                  fontFamily: 'Poppins, sans-serif'
          
            }}
            variant="h6">Summary</Typography>
            <Typography
            sx={{
                marginBottom:"0.5rem",
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight:"600",

          
            }} 
            variant="subtitle1" marginTop={2} >
              About Me
            </Typography>
            <Typography  sx={{
                textJustify:"1",
                fontFamily: 'Poppins, sans-serif',

            }}
            variant="body2"
            
            color="textSecondary">
              Lorem ipsum dolor sit amet consectetur. Sed etiam amet ornare ullamcorper enim habitant hac risus lacus. Erat leo pulvinar sed sit
               enim gravida id nulla. Eget tempor nibh tellus nunc nec sit blandit. At tempus neque ultrices mi. Tellus urna nullam orci duis sed
               nunc. Amet nisl nisl ornare suspendisse diam tempus ut dignissim. Tempus lobortis morbi elit tortor sagittis mi faucibus neque
               neque.Tellus nulla enim praesent vestibulum ornare enim. 
            </Typography>

            <Typography 
             sx={{
                marginBottom:"0.5rem",
                fontFamily: 'Poppins, sans-serif',
                fontWeight:"600"
            }} 
            variant="subtitle1" marginTop={2} >
              Why Choose Me?
            </Typography>
<Typography
      sx={{
        marginBottom:"-0.5rem",
        fontFamily: 'Poppins, sans-serif',

    }} 

variant="body2" color="textSecondary" component="div">
  <List dense>
    <ListItem disableGutters sx={{ alignItems: 'flex-start' }}>
      <ListItemIcon sx={{ minWidth: '20px', marginTop: '3px' }}>
        <CircleIcon sx={{ fontSize: '0.5rem', color: '4D4D4D' }} />
      </ListItemIcon>
     <strong> Qualified Professional: </strong> Certified with extensive experience in teaching safe driving techniques.
    </ListItem>
    <ListItem disableGutters sx={{ alignItems: 'flex-start' }}>
      <ListItemIcon sx={{ minWidth: '20px', marginTop: '3px' }}>
        <CircleIcon sx={{ fontSize: '0.5rem', color: '4D4D4D' }} />
      </ListItemIcon>
      <strong>  Student-Centered Approach:</strong> I design every lesson to suit your pace, learning style, and specific challenges.
    </ListItem>
    <ListItem disableGutters sx={{ alignItems: 'flex-start' }}>
      <ListItemIcon sx={{ minWidth: '20px', marginTop: '3px' }}>
        <CircleIcon sx={{ fontSize: '0.5rem', color: '4D4D4D' }} />
      </ListItemIcon>
      <strong> Proven Track Record:</strong> High pass rates and positive feedback from satisfied students.
    </ListItem>
    <ListItem disableGutters sx={{ alignItems: 'flex-start' }}>
      <ListItemIcon sx={{ minWidth: '20px', marginTop: '3px' }}>
        <CircleIcon sx={{ fontSize: '0.5rem', color: '4D4D4D' }} />
      </ListItemIcon>
      <strong> Road Safety Focus: </strong>  Emphasis on defensive driving and preparing you for real-world scenarios.
    </ListItem>
    <ListItem disableGutters sx={{ alignItems: 'flex-start' }}>
      <ListItemIcon sx={{ minWidth: '20px', marginTop: '3px' }}>
        <CircleIcon sx={{ fontSize: '0.5rem', color: '4D4D4D' }} />
      </ListItemIcon>
      <strong> Friendly & Patient:</strong>  Creating a stress-free environment for nervous or first-time drivers.
    </ListItem>
  </List>
</Typography>

            <Typography 
             sx={{
                marginBottom:"0.5rem",
                fontFamily: 'Poppins, sans-serif',
                fontWeight:"600"
            }} 
            variant="subtitle1" marginTop={2} >
              Language Spoken
            </Typography>
            <Typography
            sx={{
              
              fontFamily: 'Poppins, sans-serif',
           
          }} 
            
            variant="body2" color="textSecondary">
              English
            </Typography>

            <Typography
             sx={{
                marginBottom:"0.5rem",
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight:"600"
           

            }} 
             variant="subtitle1" marginTop={2} >
              Certifications
            </Typography>
            <Typography
            sx={{
              marginBottom:"0.5rem",
              fontFamily: 'Poppins, sans-serif'
          }} 
           variant="body2" color="textSecondary">
              Certified Child Care Provider
            </Typography>

            <Typography 
             sx={{
                marginBottom:"0.5rem",
                  fontFamily: 'Poppins, sans-serif',
                  fontWeight:"600"
              
            }} 
            variant="subtitle1"
             marginTop={2} >
              Verification
            </Typography>
            <Box sx={{ display: "flex", 
              alignItems: "center",
               marginBottom: "0.5rem",
          
  
             }}>
  <Typography variant="body2" color="textSecondary"
   sx={{ marginRight: "0.5rem",
    fontFamily: 'Poppins, sans-serif',
    }}>
    Criminal Record Check
  </Typography>
  <FaRegCheckCircle   style={{ color: '#25D422' }}/>
</Box>
<Box sx={{ display: "flex", alignItems: "center" }}>
  <Typography variant="body2" color="textSecondary" sx={{
     marginRight: "0.5rem",
     fontFamily: 'Poppins, sans-serif', }}>
    Reference Check
  </Typography>
  <FaRegCheckCircle  style={{ color: '#25D422' }} />
</Box>
            
          </CardContent>
        </Card>
    </div>

  );
};

export default Summary;