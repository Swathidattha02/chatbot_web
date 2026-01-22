// src/utils/GestureAnimations.js

/**
 * Enhanced gesture animations for Ready Player Me avatars
 */

export const gestureAnimations = {
  /**
   * Wave gesture - RIGHT hand waves - VERY PRONOUNCED
   */
  wave: (armBones, time) => {
    const waveSpeed = 6;
    const waveAmount = Math.sin(time * waveSpeed);
    
    if (armBones.rightArm || armBones.rightShoulder || armBones.rightUpperArm) {
      const bone = armBones.rightArm || armBones.rightShoulder || armBones.rightUpperArm;
      bone.rotation.z = 1.4 + (waveAmount * 0.4); // VERY raised arm
      bone.rotation.x = -1.0;
      bone.rotation.y = waveAmount * 0.3;
      console.log('  Arm Z:', bone.rotation.z, 'X:', bone.rotation.x);
    }
    if (armBones.rightForearm || armBones.rightLowerArm) {
      const bone = armBones.rightForearm || armBones.rightLowerArm;
      bone.rotation.x = -0.6 + (waveAmount * 0.5); // Big wave
      bone.rotation.z = waveAmount * 0.4;
    }
    if (armBones.rightHand) {
      armBones.rightHand.rotation.z = waveAmount * 0.6;
    }
  },

  /**
   * Point gesture - RIGHT arm points forward - VERY CLEAR
   */
  point: (armBones, time) => {
    if (armBones.rightArm || armBones.rightShoulder || armBones.rightUpperArm) {
      const bone = armBones.rightArm || armBones.rightShoulder || armBones.rightUpperArm;
      bone.rotation.x = -1.6; // Point straight forward
      bone.rotation.z = 0.5;
      bone.rotation.y = -0.7;
      console.log('  Point arm X:', bone.rotation.x);
    }
    if (armBones.rightForearm || armBones.rightLowerArm) {
      const bone = armBones.rightForearm || armBones.rightLowerArm;
      bone.rotation.x = 0; // Straight arm
      bone.rotation.y = 0;
    }
    if (armBones.rightHand) {
      armBones.rightHand.rotation.x = -0.4;
      armBones.rightHand.rotation.z = 0.3;
    }
  },

  /**
   * Thumbs up - RIGHT hand thumbs up - MAXIMUM VISIBILITY
   */
  thumbsUp: (armBones, time) => {
    if (armBones.rightArm || armBones.rightShoulder || armBones.rightUpperArm) {
      const bone = armBones.rightArm || armBones.rightShoulder || armBones.rightUpperArm;
      bone.rotation.z = 1.3; // Arm WAY up
      bone.rotation.x = -0.8;
      bone.rotation.y = 0.5;
      console.log('  Thumbs up arm Z:', bone.rotation.z);
    }
    if (armBones.rightForearm || armBones.rightLowerArm) {
      const bone = armBones.rightForearm || armBones.rightLowerArm;
      bone.rotation.x = -1.4; // Bent elbow
      bone.rotation.y = 0.2;
    }
    if (armBones.rightHand) {
      armBones.rightHand.rotation.z = Math.PI / 2; // Thumb up
      armBones.rightHand.rotation.y = 0.6;
      armBones.rightHand.rotation.x = -0.2;
    }
  },

  /**
   * Thumbs down - RIGHT hand thumbs down
   */
  thumbsDown: (armBones, time) => {
    if (armBones.rightArm || armBones.rightShoulder || armBones.rightUpperArm) {
      const bone = armBones.rightArm || armBones.rightShoulder || armBones.rightUpperArm;
      bone.rotation.z = 0.9;
      bone.rotation.x = -0.6;
      bone.rotation.y = 0.3;
    }
    if (armBones.rightForearm || armBones.rightLowerArm) {
      const bone = armBones.rightForearm || armBones.rightLowerArm;
      bone.rotation.x = -1.2;
    }
    if (armBones.rightHand) {
      armBones.rightHand.rotation.z = -Math.PI / 2; // Thumb down
      armBones.rightHand.rotation.y = -0.5;
    }
    console.log('👎 Thumbs down gesture active');
  },

  /**
   * Shrug - BOTH arms up
   */
  shrug: (armBones, time) => {
    // Right arm
    if (armBones.rightArm || armBones.rightShoulder || armBones.rightUpperArm) {
      const bone = armBones.rightArm || armBones.rightShoulder || armBones.rightUpperArm;
      bone.rotation.z = 1.2; // Raised
      bone.rotation.x = -0.4;
      bone.rotation.y = 0.3;
    }
    if (armBones.rightForearm || armBones.rightLowerArm) {
      const bone = armBones.rightForearm || armBones.rightLowerArm;
      bone.rotation.x = -0.8;
    }
    
    // Left arm  
    if (armBones.leftArm || armBones.leftShoulder || armBones.leftUpperArm) {
      const bone = armBones.leftArm || armBones.leftShoulder || armBones.leftUpperArm;
      bone.rotation.z = -1.2; // Raised
      bone.rotation.x = -0.4;
      bone.rotation.y = -0.3;
    }
    if (armBones.leftForearm || armBones.leftLowerArm) {
      const bone = armBones.leftForearm || armBones.leftLowerArm;
      bone.rotation.x = -0.8;
    }
    console.log('🤷 Shrug gesture active');
  },

  /**
   * Clap - BOTH hands clapping
   */
  clap: (armBones, time) => {
    const clapSpeed = 10;
    const clapAmount = Math.abs(Math.sin(time * clapSpeed)) * 0.4;
    
    // Right arm
    if (armBones.rightArm || armBones.rightShoulder || armBones.rightUpperArm) {
      const bone = armBones.rightArm || armBones.rightShoulder || armBones.rightUpperArm;
      bone.rotation.z = 0.5 + clapAmount;
      bone.rotation.x = -Math.PI / 2.5;
      bone.rotation.y = -0.6 - clapAmount;
    }
    if (armBones.rightForearm || armBones.rightLowerArm) {
      const bone = armBones.rightForearm || armBones.rightLowerArm;
      bone.rotation.x = -0.3;
    }
    
    // Left arm
    if (armBones.leftArm || armBones.leftShoulder || armBones.leftUpperArm) {
      const bone = armBones.leftArm || armBones.leftShoulder || armBones.leftUpperArm;
      bone.rotation.z = -0.5 - clapAmount;
      bone.rotation.x = -Math.PI / 2.5;
      bone.rotation.y = 0.6 + clapAmount;
    }
    if (armBones.leftForearm || armBones.leftLowerArm) {
      const bone = armBones.leftForearm || armBones.leftLowerArm;
      bone.rotation.x = -0.3;
    }
    console.log('👏 Clap gesture active');
  },

  /**
   * Thinking - RIGHT hand on chin
   */
  thinking: (armBones, time) => {
    if (armBones.rightArm || armBones.rightShoulder || armBones.rightUpperArm) {
      const bone = armBones.rightArm || armBones.rightShoulder || armBones.rightUpperArm;
      bone.rotation.z = 0.6;
      bone.rotation.x = -1.2;
      bone.rotation.y = -0.5;
    }
    if (armBones.rightForearm || armBones.rightLowerArm) {
      const bone = armBones.rightForearm || armBones.rightLowerArm;
      bone.rotation.x = -1.6; // Bent to bring hand to chin
    }
    if (armBones.rightHand) {
      armBones.rightHand.rotation.x = -0.5;
    }
    console.log('🤔 Thinking gesture active');
  },

  /**
   * Explain - BOTH hands open, moving
   */
  explain: (armBones, time) => {
    const moveAmount = Math.sin(time * 3) * 0.2;
    
    // Right arm
    if (armBones.rightArm || armBones.rightShoulder || armBones.rightUpperArm) {
      const bone = armBones.rightArm || armBones.rightShoulder || armBones.rightUpperArm;
      bone.rotation.z = 0.7 + moveAmount;
      bone.rotation.x = -0.8;
      bone.rotation.y = -0.3;
    }
    if (armBones.rightForearm || armBones.rightLowerArm) {
      const bone = armBones.rightForearm || armBones.rightLowerArm;
      bone.rotation.x = -0.5 + (moveAmount * 0.5);
    }
    if (armBones.rightHand) {
      armBones.rightHand.rotation.x = 0.3;
      armBones.rightHand.rotation.z = moveAmount * 0.3;
    }
    
    // Left arm
    if (armBones.leftArm || armBones.leftShoulder || armBones.leftUpperArm) {
      const bone = armBones.leftArm || armBones.leftShoulder || armBones.leftUpperArm;
      bone.rotation.z = -0.7 - moveAmount;
      bone.rotation.x = -0.8;
      bone.rotation.y = 0.3;
    }
    if (armBones.leftForearm || armBones.leftLowerArm) {
      const bone = armBones.leftForearm || armBones.leftLowerArm;
      bone.rotation.x = -0.5 - (moveAmount * 0.5);
    }
    if (armBones.leftHand) {
      armBones.leftHand.rotation.x = 0.3;
      armBones.leftHand.rotation.z = -moveAmount * 0.3;
    }
    console.log('📖 Explain gesture active');
  },

  /**
   * Idle - Natural resting pose with arms DOWN
   */
  idle: (armBones, time) => {
    const breathe = Math.sin(time * 0.8) * 0.02;
    
    // Right arm - DOWN position
    if (armBones.rightArm || armBones.rightShoulder || armBones.rightUpperArm) {
      const bone = armBones.rightArm || armBones.rightShoulder || armBones.rightUpperArm;
      bone.rotation.x = 0 + breathe; // Neutral
      bone.rotation.z = 0.08; // Slightly away from body
      bone.rotation.y = 0.05;
    }
    if (armBones.rightForearm || armBones.rightLowerArm) {
      const bone = armBones.rightForearm || armBones.rightLowerArm;
      bone.rotation.x = 0.1 + (breathe * 0.5); // Slight bend
      bone.rotation.y = 0;
      bone.rotation.z = 0;
    }
    if (armBones.rightHand) {
      armBones.rightHand.rotation.x = 0;
      armBones.rightHand.rotation.y = 0;
      armBones.rightHand.rotation.z = 0;
    }
    
    // Left arm - DOWN position
    if (armBones.leftArm || armBones.leftShoulder || armBones.leftUpperArm) {
      const bone = armBones.leftArm || armBones.leftShoulder || armBones.leftUpperArm;
      bone.rotation.x = 0 + breathe; // Neutral
      bone.rotation.z = -0.08; // Slightly away from body
      bone.rotation.y = -0.05;
    }
    if (armBones.leftForearm || armBones.leftLowerArm) {
      const bone = armBones.leftForearm || armBones.leftLowerArm;
      bone.rotation.x = 0.1 + (breathe * 0.5); // Slight bend
      bone.rotation.y = 0;
      bone.rotation.z = 0;
    }
    if (armBones.leftHand) {
      armBones.leftHand.rotation.x = 0;
      armBones.leftHand.rotation.y = 0;
      armBones.leftHand.rotation.z = 0;
    }
  },

  /**
   * Reset all bones to zero
   */
  reset: (armBones) => {
    Object.values(armBones).forEach(bone => {
      if (bone && bone.rotation) {
        bone.rotation.x = 0;
        bone.rotation.y = 0;
        bone.rotation.z = 0;
      }
    });
  }
};

/**
 * Find arm bones with extensive name matching for Ready Player Me
 */
export const findArmBones = (skeleton) => {
  const bones = {};
  
  if (!skeleton || !skeleton.bones) {
    console.warn('No skeleton or bones found');
    return bones;
  }
  
  console.log('=== SEARCHING FOR ARM BONES ===');
  console.log('Total bones in skeleton:', skeleton.bones.length);
  console.log('ALL BONE NAMES:');
  
  // First pass: log ALL bone names
  skeleton.bones.forEach((bone, index) => {
    console.log(`  ${index}. ${bone.name}`);
  });
  
  console.log('\n=== MATCHING ARM BONES ===');
  
  skeleton.bones.forEach(bone => {
    const name = bone.name.toLowerCase();
    const originalName = bone.name;
    
    // Right arm - prioritize RightArm over RightShoulder
    if (name === 'rightarm') {
      bones.rightArm = bone;
      bones.rightUpperArm = bone;
      console.log('✅ RIGHT ARM (MAIN):', originalName);
    }
    if (name === 'rightshoulder' && !bones.rightShoulder) {
      bones.rightShoulder = bone;
      console.log('✅ RIGHT SHOULDER:', originalName);
    }
    
    // Right forearm
    if (name === 'rightforearm') {
      bones.rightForearm = bone;
      bones.rightLowerArm = bone;
      console.log('✅ RIGHT FOREARM:', originalName);
    }
    
    // Right hand
    if (name === 'righthand') {
      bones.rightHand = bone;
      console.log('✅ RIGHT HAND:', originalName);
    }
    
    // Left arm - prioritize LeftArm over LeftShoulder
    if (name === 'leftarm') {
      bones.leftArm = bone;
      bones.leftUpperArm = bone;
      console.log('✅ LEFT ARM (MAIN):', originalName);
    }
    if (name === 'leftshoulder' && !bones.leftShoulder) {
      bones.leftShoulder = bone;
      console.log('✅ LEFT SHOULDER:', originalName);
    }
    
    // Left forearm
    if (name === 'leftforearm') {
      bones.leftForearm = bone;
      bones.leftLowerArm = bone;
      console.log('✅ LEFT FOREARM:', originalName);
    }
    
    // Left hand
    if (name === 'lefthand') {
      bones.leftHand = bone;
      console.log('✅ LEFT HAND:', originalName);
    }
  });
  
  console.log('\n=== FOUND BONES SUMMARY ===');
  console.log('Right Arm:', bones.rightArm?.name || '❌ NOT FOUND');
  console.log('Right Forearm:', bones.rightForearm?.name || '❌ NOT FOUND');
  console.log('Right Hand:', bones.rightHand?.name || '❌ NOT FOUND');
  console.log('Left Arm:', bones.leftArm?.name || '❌ NOT FOUND');
  console.log('Left Forearm:', bones.leftForearm?.name || '❌ NOT FOUND');
  console.log('Left Hand:', bones.leftHand?.name || '❌ NOT FOUND');
  console.log('Total arm bones found:', Object.keys(bones).length);
  console.log('===========================\n');
  
  if (Object.keys(bones).length === 0) {
    console.error('❌ NO ARM BONES FOUND! Gestures will NOT work.');
    console.log('💡 Send the full bone list above to get help!');
  } else if (Object.keys(bones).length < 4) {
    console.warn('⚠️ Only found', Object.keys(bones).length, 'bones - gestures may be limited');
  } else {
    console.log('✅ Found', Object.keys(bones).length, 'arm bones - gestures should work!');
  }
  
  return bones;
};