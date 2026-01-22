import React, { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { gestureAnimations, findArmBones } from '../utils/GestureAnimations';

const LipSyncAvatar = ({
  url,
  animation,
  mouthValue,
  expression = 'neutral',
  gesture = 'idle',
  position = [0, 0, 0],
  scale = 1
}) => {
  const group = useRef();
  const { scene, animations } = useGLTF(url);
  const mixer = useRef();
  const actions = useRef({});
  const currentAction = useRef();
  const morphTargetMeshes = useRef([]);
  const expressionMeshes = useRef([]);
  const armBones = useRef({});
  const skeleton = useRef(null);
  const gestureTime = useRef(0);
  const lastBlinkTime = useRef(0);
  const blinkDuration = useRef(0);
  const isBlinking = useRef(false);
  const microExpressionTime = useRef(0);

  // Expression-based lip sync modifiers for realistic coordination
  const getExpressionLipModifiers = (expr) => {
    switch (expr) {
      case 'happy':
      case 'smile':
        return {
          mouthOpenMultiplier: 1.2,      // Wider mouth when happy
          smileBlend: 0.4,               // Add smile to speech
          jawMultiplier: 1.1,            // More jaw movement
          lipStretch: 0.2,               // Stretched lips
          energyLevel: 1.3               // More energetic movements
        };
      case 'sad':
        return {
          mouthOpenMultiplier: 0.7,      // Reserved, smaller movements
          smileBlend: -0.2,              // Slight frown during speech
          jawMultiplier: 0.8,            // Less jaw movement
          lipStretch: -0.1,              // Tight lips
          energyLevel: 0.6               // Subdued, slower
        };
      case 'surprised':
        return {
          mouthOpenMultiplier: 1.4,      // Very open mouth
          smileBlend: 0,                 // Neutral smile
          jawMultiplier: 1.3,            // More jaw drop
          lipStretch: 0.15,              // Slight stretch
          energyLevel: 1.5               // Very energetic
        };
      case 'angry':
        return {
          mouthOpenMultiplier: 0.85,     // Tighter controlled speech
          smileBlend: -0.3,              // Frown
          jawMultiplier: 0.9,            // Tense jaw
          lipStretch: 0.1,               // Tense lips
          energyLevel: 1.1               // Intense but controlled
        };
      case 'thinking':
        return {
          mouthOpenMultiplier: 0.75,     // Thoughtful, measured
          smileBlend: 0,                 // Neutral
          jawMultiplier: 0.7,            // Minimal jaw
          lipStretch: 0,                 // Relaxed
          energyLevel: 0.7               // Calm, deliberate
        };
      case 'worried':
        return {
          mouthOpenMultiplier: 0.8,      // Nervous, restrained
          smileBlend: -0.15,             // Slight tension
          jawMultiplier: 0.85,           // Tense
          lipStretch: 0.05,              // Slight tension
          energyLevel: 0.9               // Anxious but controlled
        };
      default:
        return {
          mouthOpenMultiplier: 1.0,
          smileBlend: 0,
          jawMultiplier: 1.0,
          lipStretch: 0,
          energyLevel: 1.0
        };
    }
  };

  // Initialize animations
  useEffect(() => {
    if (animations && animations.length > 0) {
      mixer.current = new THREE.AnimationMixer(scene);

      animations.forEach((clip) => {
        const action = mixer.current.clipAction(clip);
        actions.current[clip.name] = action;
      });

      console.log('Available animations:', Object.keys(actions.current));
    }

    // Find meshes with morph targets and skeleton
    scene.traverse((child) => {
      if (child.isMesh && child.morphTargetInfluences) {
        morphTargetMeshes.current.push(child);
        expressionMeshes.current.push(child);
        console.log('Found morph target mesh:', child.name);
        if (child.morphTargetDictionary) {
          console.log('=== ALL AVAILABLE MORPH TARGETS ===');
          const morphNames = Object.keys(child.morphTargetDictionary);
          morphNames.forEach(name => {
            console.log(`  - ${name}`);
          });
          console.log('===================================');
        }
      }

      // Find skeleton for hand gestures
      if (child.isSkinnedMesh && child.skeleton) {
        skeleton.current = child.skeleton;
        armBones.current = findArmBones(child.skeleton);
      }
    });

    return () => {
      if (mixer.current) {
        mixer.current.stopAllAction();
      }
    };
  }, [scene, animations]);

  // Handle animation changes
  useEffect(() => {
    if (!mixer.current || !actions.current) return;

    const animationMap = {
      'idle': 'Idle',
      'wave': 'Wave',
      'talking': 'Talking',
      'thinking': 'Thinking',
      'happy': 'Happy',
      'surprised': 'Surprised',
      'nodding': 'Nodding',
      'shaking': 'Shaking'
    };

    const animationName = animationMap[animation] || 'Idle';
    const action = actions.current[animationName];

    if (action) {
      if (currentAction.current && currentAction.current !== action) {
        currentAction.current.fadeOut(0.5);
      }
      action.reset().fadeIn(0.5).play();
      currentAction.current = action;
    }
  }, [animation]);

  // Update mouth morph targets with expression-aware variations
  useEffect(() => {
    if (morphTargetMeshes.current.length > 0) {
      const lipMods = getExpressionLipModifiers(expression);

      morphTargetMeshes.current.forEach((mesh) => {
        if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
          // More realistic phoneme grouping based on actual speech
          const openVowels = ['viseme_aa', 'viseme_O'];     // Wide open: "ah", "oh"
          const midVowels = ['viseme_E', 'viseme_I'];       // Medium: "eh", "ee"
          const closeVowels = ['viseme_U'];                 // Close: "oo"

          const labialConsonants = ['viseme_PP', 'viseme_FF'];  // Lips together/teeth: p, b, m, f, v
          const dentalConsonants = ['viseme_TH', 'viseme_DD'];  // Tongue: th, d, t, n, l
          const velarConsonants = ['viseme_kk', 'viseme_CH'];   // Back throat: k, g, ch
          const fricatives = ['viseme_SS', 'viseme_RR'];        // Hissing: s, z, sh, r
          const nasals = ['viseme_nn'];                         // Nose: n, m, ng

          // Wide open vowels - most mouth movement
          openVowels.forEach((viseme) => {
            const morphIndex = mesh.morphTargetDictionary[viseme];
            if (morphIndex !== undefined) {
              const intensity = mouthValue * 0.55 * lipMods.mouthOpenMultiplier;
              mesh.morphTargetInfluences[morphIndex] = Math.max(0, Math.min(intensity, 0.5));
            }
          });

          // Medium vowels - moderate opening
          midVowels.forEach((viseme) => {
            const morphIndex = mesh.morphTargetDictionary[viseme];
            if (morphIndex !== undefined) {
              const intensity = mouthValue * 0.45 * lipMods.mouthOpenMultiplier;
              mesh.morphTargetInfluences[morphIndex] = Math.max(0, Math.min(intensity, 0.4));
            }
          });

          // Close vowels - slight opening with lip rounding
          closeVowels.forEach((viseme) => {
            const morphIndex = mesh.morphTargetDictionary[viseme];
            if (morphIndex !== undefined) {
              const intensity = mouthValue * 0.35 * lipMods.mouthOpenMultiplier;
              mesh.morphTargetInfluences[morphIndex] = Math.max(0, Math.min(intensity, 0.35));
            }
          });

          // Labial consonants - lips pressed together
          labialConsonants.forEach((viseme) => {
            const morphIndex = mesh.morphTargetDictionary[viseme];
            if (morphIndex !== undefined) {
              const intensity = mouthValue * 0.3 * lipMods.mouthOpenMultiplier;
              mesh.morphTargetInfluences[morphIndex] = Math.max(0, Math.min(intensity, 0.3));
            }
          });

          // Dental consonants - tongue visible
          dentalConsonants.forEach((viseme) => {
            const morphIndex = mesh.morphTargetDictionary[viseme];
            if (morphIndex !== undefined) {
              const intensity = mouthValue * 0.25 * lipMods.mouthOpenMultiplier;
              mesh.morphTargetInfluences[morphIndex] = Math.max(0, Math.min(intensity, 0.25));
            }
          });

          // Velar consonants - back of mouth
          velarConsonants.forEach((viseme) => {
            const morphIndex = mesh.morphTargetDictionary[viseme];
            if (morphIndex !== undefined) {
              const intensity = mouthValue * 0.32 * lipMods.mouthOpenMultiplier;
              mesh.morphTargetInfluences[morphIndex] = Math.max(0, Math.min(intensity, 0.3));
            }
          });

          // Fricatives - narrow opening
          fricatives.forEach((viseme) => {
            const morphIndex = mesh.morphTargetDictionary[viseme];
            if (morphIndex !== undefined) {
              const intensity = mouthValue * 0.22 * lipMods.mouthOpenMultiplier;
              mesh.morphTargetInfluences[morphIndex] = Math.max(0, Math.min(intensity, 0.22));
            }
          });

          // Nasals - mouth mostly closed
          nasals.forEach((viseme) => {
            const morphIndex = mesh.morphTargetDictionary[viseme];
            if (morphIndex !== undefined) {
              const intensity = mouthValue * 0.18 * lipMods.mouthOpenMultiplier;
              mesh.morphTargetInfluences[morphIndex] = Math.max(0, Math.min(intensity, 0.18));
            }
          });

          // Realistic jaw movement - follows vowel intensity
          const jawIndex = mesh.morphTargetDictionary['jawOpen'];
          if (jawIndex !== undefined) {
            // Jaw opens more for vowels, less for consonants
            const jawIntensity = mouthValue * 0.35 * lipMods.jawMultiplier;
            mesh.morphTargetInfluences[jawIndex] = Math.max(0, Math.min(jawIntensity, 0.4));
          }

          // Natural lip movements during speech based on expression
          const mouthSmileLeft = mesh.morphTargetDictionary['mouthSmileLeft'];
          const mouthSmileRight = mesh.morphTargetDictionary['mouthSmileRight'];
          const mouthFrownLeft = mesh.morphTargetDictionary['mouthFrownLeft'];
          const mouthFrownRight = mesh.morphTargetDictionary['mouthFrownRight'];

          // Blend smile when happy while speaking
          if (lipMods.smileBlend > 0 && mouthSmileLeft !== undefined && mouthSmileRight !== undefined) {
            const smileIntensity = mouthValue * lipMods.smileBlend * 0.6;
            mesh.morphTargetInfluences[mouthSmileLeft] = Math.min(smileIntensity, 0.45);
            mesh.morphTargetInfluences[mouthSmileRight] = Math.min(smileIntensity, 0.45);
          }
          // Blend frown when sad/angry while speaking
          else if (lipMods.smileBlend < 0 && mouthFrownLeft !== undefined && mouthFrownRight !== undefined) {
            const frownIntensity = mouthValue * Math.abs(lipMods.smileBlend) * 0.5;
            mesh.morphTargetInfluences[mouthFrownLeft] = Math.min(frownIntensity, 0.35);
            mesh.morphTargetInfluences[mouthFrownRight] = Math.min(frownIntensity, 0.35);
          }

          // Add lip corner pull for more natural articulation
          const mouthUpperUpLeft = mesh.morphTargetDictionary['mouthUpperUpLeft'];
          const mouthUpperUpRight = mesh.morphTargetDictionary['mouthUpperUpRight'];
          if (mouthUpperUpLeft !== undefined && mouthUpperUpRight !== undefined) {
            const upperLipIntensity = mouthValue * 0.15;
            mesh.morphTargetInfluences[mouthUpperUpLeft] = Math.min(upperLipIntensity, 0.2);
            mesh.morphTargetInfluences[mouthUpperUpRight] = Math.min(upperLipIntensity, 0.2);
          }

          // Subtle mouth funnel for rounded sounds
          const mouthFunnel = mesh.morphTargetDictionary['mouthFunnel'];
          if (mouthFunnel !== undefined) {
            const funnelIntensity = mouthValue * 0.12;
            mesh.morphTargetInfluences[mouthFunnel] = Math.min(funnelIntensity, 0.15);
          }
        }
      });
    }
  }, [mouthValue, expression]);

  // Update facial expressions
  useEffect(() => {
    if (expressionMeshes.current.length > 0) {
      expressionMeshes.current.forEach((mesh) => {
        if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {

          const availableMorphs = Object.keys(mesh.morphTargetDictionary);

          // Reset non-viseme morphs
          availableMorphs.forEach(key => {
            if (!key.startsWith('viseme_') && !key.startsWith('eyeBlink')) {
              const index = mesh.morphTargetDictionary[key];
              if (index !== undefined) {
                mesh.morphTargetInfluences[index] = 0;
              }
            }
          });

          // Helper to set morph value
          const setMorph = (morphName, value) => {
            const index = mesh.morphTargetDictionary[morphName];
            if (index !== undefined) {
              mesh.morphTargetInfluences[index] = value;
              return true;
            }
            return false;
          };

          // Create realistic human expressions with natural micro-movements
          switch (expression) {
            case 'happy':
            case 'smile':
              // Genuine Duchenne smile - natural and warm
              setMorph('mouthSmileLeft', 0.85);
              setMorph('mouthSmileRight', 0.85);
              setMorph('eyeSquintLeft', 0.45);          // Crow's feet - genuine smile indicator
              setMorph('eyeSquintRight', 0.45);
              setMorph('cheekSquintLeft', 0.65);        // Raised cheeks
              setMorph('cheekSquintRight', 0.65);
              setMorph('mouthDimpleLeft', 0.35);        // Natural dimples
              setMorph('mouthDimpleRight', 0.35);
              setMorph('mouthUpperUpLeft', 0.15);       // Slight upper lip raise
              setMorph('mouthUpperUpRight', 0.15);
              setMorph('browOuterUpLeft', 0.1);
              setMorph('browOuterUpRight', 0.1);
              break;

            case 'sad':
              // Natural sadness - empathetic and genuine
              setMorph('mouthFrownLeft', 0.7);
              setMorph('mouthFrownRight', 0.7);
              setMorph('mouthLowerDownLeft', 0.65);     // Drooping mouth corners
              setMorph('mouthLowerDownRight', 0.65);
              setMorph('browInnerUp', 0.75);            // Sad eyebrows - inner up
              setMorph('browOuterUpLeft', 0.2);
              setMorph('browOuterUpRight', 0.2);
              setMorph('eyeSquintLeft', 0.25);          // Slight eye tension
              setMorph('eyeSquintRight', 0.25);
              setMorph('mouthShrugLower', 0.4);
              setMorph('eyesClosed', 0.15);
              break;

            case 'surprised':
              // Natural surprise - genuine astonishment
              setMorph('eyeWideLeft', 0.9);
              setMorph('eyeWideRight', 0.9);
              setMorph('browOuterUpLeft', 0.85);        // Raised outer brows
              setMorph('browOuterUpRight', 0.85);
              setMorph('browInnerUp', 0.75);            // Raised inner brows
              setMorph('jawOpen', 0.5);                 // Moderate mouth opening
              setMorph('mouthFunnel', 0.35);            // O-shaped mouth
              setMorph('eyeBlinkLeft', -0.2);
              setMorph('eyeBlinkRight', -0.2);
              setMorph('cheekPuff', 0.1);
              break;

            case 'thinking':
              // Realistic contemplation - natural pondering look
              setMorph('browInnerUp', 0.4);             // Slight concentration
              setMorph('browOuterUpLeft', 0.5);         // Asymmetric brows
              setMorph('browOuterUpRight', 0.2);
              setMorph('eyeSquintRight', 0.3);          // One eye more squinted
              setMorph('eyeSquintLeft', 0.15);
              setMorph('mouthPucker', 0.5);             // Pursed lips
              setMorph('mouthLeft', 0.3);               // Mouth to side
              setMorph('jawLeft', 0.25);                // Jaw slightly left
              setMorph('mouthRollLower', 0.35);         // Lower lip rolled in
              setMorph('mouthUpperUpLeft', 0.15);       // Asymmetric upper lip
              setMorph('eyeLookDownLeft', 0.2);
              setMorph('eyeLookDownRight', 0.2);
              break;

            case 'angry':
              // Controlled anger - tense but realistic
              setMorph('mouthFrownLeft', 0.75);
              setMorph('mouthFrownRight', 0.75);
              setMorph('eyeSquintLeft', 0.7);           // Intense squint
              setMorph('eyeSquintRight', 0.7);
              setMorph('browDownLeft', 0.8);            // Furrowed brows
              setMorph('browDownRight', 0.8);
              setMorph('browInnerUp', 0.3);             // Slight inner tension
              setMorph('noseSneerLeft', 0.5);           // Nose wrinkle
              setMorph('noseSneerRight', 0.5);
              setMorph('mouthPressLeft', 0.6);          // Pressed lips
              setMorph('mouthPressRight', 0.6);
              setMorph('jawForward', 0.35);
              setMorph('mouthStretchLeft', 0.2);
              setMorph('mouthStretchRight', 0.2);
              break;

            case 'worried':
              // Natural concern - empathetic worry
              setMorph('browInnerUp', 0.85);            // Strong inner brow raise
              setMorph('browOuterUpLeft', 0.4);         // Worried brow shape
              setMorph('browOuterUpRight', 0.4);
              setMorph('eyeWideLeft', 0.6);             // Concerned eyes
              setMorph('eyeWideRight', 0.6);
              setMorph('eyeSquintLeft', 0.2);           // Slight tension
              setMorph('eyeSquintRight', 0.2);
              setMorph('mouthFrownLeft', 0.55);         // Slight frown
              setMorph('mouthFrownRight', 0.55);
              setMorph('mouthLowerDownLeft', 0.45);     // Drooping corners
              setMorph('mouthLowerDownRight', 0.45);
              setMorph('mouthStretchLeft', 0.3);
              setMorph('mouthStretchRight', 0.3);
              setMorph('mouthPressLeft', 0.2);
              setMorph('mouthPressRight', 0.2);
              break;

            case 'neutral':
            default:
              setMorph('mouthSmileLeft', 0.05);
              setMorph('mouthSmileRight', 0.05);
              setMorph('eyeSquintLeft', 0.02);
              setMorph('eyeSquintRight', 0.02);
              break;
          }
        }
      });
    }
  }, [expression]);

  // Animation loop with gestures
  useFrame((state, delta) => {
    if (mixer.current) {
      mixer.current.update(delta);
    }

    // Update gesture time
    gestureTime.current += delta;

    // Simple natural eye blinking (every 3-5 seconds)
    const currentTime = state.clock.elapsedTime;
    if (!isBlinking.current && currentTime - lastBlinkTime.current > 3 + Math.random() * 2) {
      isBlinking.current = true;
      blinkDuration.current = 0;
      lastBlinkTime.current = currentTime;
    }

    // Apply simple blinking animation
    if (isBlinking.current) {
      blinkDuration.current += delta;
      const blinkProgress = blinkDuration.current / 0.12; // 120ms blink

      expressionMeshes.current.forEach((mesh) => {
        if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
          const blinkLeftIndex = mesh.morphTargetDictionary['eyeBlinkLeft'];
          const blinkRightIndex = mesh.morphTargetDictionary['eyeBlinkRight'];

          let blinkValue;
          if (blinkProgress < 0.5) {
            blinkValue = blinkProgress * 2;
          } else {
            blinkValue = 2 - (blinkProgress * 2);
          }

          if (blinkLeftIndex !== undefined) {
            mesh.morphTargetInfluences[blinkLeftIndex] = Math.max(0, Math.min(blinkValue, 1));
          }
          if (blinkRightIndex !== undefined) {
            mesh.morphTargetInfluences[blinkRightIndex] = Math.max(0, Math.min(blinkValue, 1));
          }
        }
      });

      if (blinkDuration.current > 0.12) {
        isBlinking.current = false;
      }
    }

    // Apply hand gestures if bones are available
    if (Object.keys(armBones.current).length > 0 && gesture && gesture !== 'idle') {
      const gestureFunc = gestureAnimations[gesture];
      if (gestureFunc) {
        gestureAnimations.reset(armBones.current);
        try {
          gestureFunc(armBones.current, gestureTime.current);
        } catch (error) {
          console.error('Error applying gesture:', error);
        }
      }
    } else if (gesture === 'idle') {
      gestureAnimations.idle(armBones.current, gestureTime.current);
    }

    // Idle animation with subtle breathing
    if (group.current && animation === 'idle') {
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.015;
      const breatheOffset = Math.sin(state.clock.elapsedTime * 0.5) * 0.005;
      group.current.position.set(position[0], position[1] + breatheOffset, position[2]);
    } else if (group.current) {
      group.current.position.set(position[0], position[1], position[2]);
      group.current.rotation.y = 0;
    }
  });

  return (
    <group ref={group} position={position} scale={scale}>
      <primitive object={scene} />
    </group>
  );
};

export default LipSyncAvatar;