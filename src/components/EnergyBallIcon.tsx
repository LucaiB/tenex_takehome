import React from 'react';
import { Box, keyframes } from '@mui/material';

interface EnergyBallIconProps {
  size?: 'small' | 'medium' | 'large';
}

const EnergyBallIcon: React.FC<EnergyBallIconProps> = ({ size = 'medium' }) => {
  // Size configurations
  const sizes = {
    small: { container: 24, ball: 16, core: 6, particle: 3, sparkle: 2, wave: 24, glow: 36 },
    medium: { container: 40, ball: 24, core: 8, particle: 4, sparkle: 3, wave: 40, glow: 60 },
    large: { container: 56, ball: 32, core: 10, particle: 5, sparkle: 4, wave: 56, glow: 80 },
  };

  const config = sizes[size];

  // Keyframe animations
  const pulse = keyframes`
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.9; }
    100% { transform: scale(1); opacity: 1; }
  `;

  const float = keyframes`
    0% { transform: translateY(0px); }
    50% { transform: translateY(-2px); }
    100% { transform: translateY(0px); }
  `;

  const orbit = keyframes`
    0% { transform: rotate(0deg) translateX(${config.particle * 1.5}px) rotate(0deg); }
    100% { transform: rotate(360deg) translateX(${config.particle * 1.5}px) rotate(-360deg); }
  `;

  return (
    <Box
      sx={{
        position: 'relative',
        width: config.container,
        height: config.container,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Main orb */}
      <Box
        sx={{
          width: config.ball,
          height: config.ball,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: `
            0 4px 20px rgba(102, 126, 234, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.1) inset,
            0 0 0 4px rgba(255, 255, 255, 0.05)
          `,
          animation: `${pulse} 3s ease-in-out infinite`,
          position: 'relative',
          zIndex: 2,
          overflow: 'hidden',
        }}
      >
        {/* Inner glow */}
        <Box
          sx={{
            position: 'absolute',
            top: '20%',
            left: '20%',
            width: '60%',
            height: '60%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%)',
            animation: `${float} 4s ease-in-out infinite`,
          }}
        />
        
        {/* Core highlight */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: config.core,
            height: config.core,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.4) 100%)',
            transform: 'translate(-50%, -50%)',
            animation: `${pulse} 2s ease-in-out infinite reverse`,
          }}
        />
      </Box>

      {/* Subtle orbiting dots */}
      {[0, 1, 2].map((index) => (
        <Box
          key={index}
          sx={{
            position: 'absolute',
            width: config.particle * 0.8,
            height: config.particle * 0.8,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.6)',
            animation: `${orbit} ${3 + index * 0.3}s linear infinite`,
            animationDelay: `${index * 0.8}s`,
            zIndex: 1,
          }}
        />
      ))}

      {/* Minimal pulse ring */}
      <Box
        sx={{
          position: 'absolute',
          width: config.container * 0.8,
          height: config.container * 0.8,
          borderRadius: '50%',
          border: '1px solid rgba(102, 126, 234, 0.2)',
          animation: `${pulse} 4s ease-in-out infinite`,
          zIndex: 0,
        }}
      />
    </Box>
  );
};

export default EnergyBallIcon;
