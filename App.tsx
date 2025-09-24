import React, { useState, useEffect, useCallback, useRef } from 'react';
import { KiteCanvas } from './components/KiteCanvas';
import { StartMenu } from './components/StartMenu';
import { PauseMenu } from './components/PauseMenu';

export type GameState = 'menu' | 'playing' | 'paused';
export type WeatherType = 'sunny' | 'sunset' | 'stormy' | 'night';

const weatherOptions: WeatherType[] = ['sunny', 'sunset', 'stormy', 'night'];
const colors = ['#ff0055', '#0099ff', '#ffcc00', '#25d366', '#9b59b6', '#e67e22'];

function App(): JSX.Element {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [windSpeed, setWindSpeed] = useState(0.5);
  const [kiteColor, setKiteColor] = useState('#ff0055');
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState(0.5);
  const [weather, setWeather] = useState<WeatherType>('sunny');
  const [isMuted, setIsMuted] = useState(false);
  const [gamepadIndex, setGamepadIndex] = useState<number | null>(null);
  
  // Gamepad state refs
  const pauseButtonWasPressed = useRef(false);
  const menuSelectWasPressed = useRef(false);
  const axisMoved = useRef({ x: false, y: false });
  const dpadPressed = useRef({ x: false, y: false });

  // Menu navigation state
  const [focusedButtonIndex, setFocusedButtonIndex] = useState(4); // Start with "Start Flying" focused
  const [lastWeatherFocusIndex, setLastWeatherFocusIndex] = useState(0);
  const [pauseFocusedIndex, setPauseFocusedIndex] = useState(3); // Start with "Resume" focused
  const [colorFocusedIndex, setColorFocusedIndex] = useState(0);

  const handleStartGame = useCallback(async () => {
    try {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            await elem.requestFullscreen();
        } else if ((elem as any).mozRequestFullScreen) { /* Firefox */
            await (elem as any).mozRequestFullScreen();
        } else if ((elem as any).webkitRequestFullscreen) { /* Chrome, Safari & Opera */
            await (elem as any).webkitRequestFullscreen();
        } else if ((elem as any).msRequestFullscreen) { /* IE/Edge */
            await (elem as any).msRequestFullscreen();
        }
    } catch (e) {
        console.error("Fullscreen request failed:", e);
    }
    setScore(0); // Reset score when starting a new game
    setGameState('playing');
  }, []);
  
  const handlePauseToggle = useCallback(() => {
    setGameState(prev => {
        if (prev === 'playing') {
            const currentColorIndex = colors.indexOf(kiteColor);
            setColorFocusedIndex(currentColorIndex > -1 ? currentColorIndex : 0);
            setPauseFocusedIndex(3); // Reset focus to Resume
            return 'paused';
        }
        return 'playing';
    });
  }, [kiteColor]);

  const handleGoToMenu = useCallback(() => {
    setGameState('menu');
    setFocusedButtonIndex(4); // Reset focus when returning to menu
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (gameState === 'playing' || gameState === 'paused') {
          handlePauseToggle();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handlePauseToggle]);
  
  useEffect(() => {
    const handleGamepadConnected = (e: GamepadEvent) => {
        if (gamepadIndex === null) {
            setGamepadIndex(e.gamepad.index);
        }
    };

    const handleGamepadDisconnected = (e: GamepadEvent) => {
        if (gamepadIndex === e.gamepad.index) {
            setGamepadIndex(null);
        }
    };
    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);

    return () => {
        window.removeEventListener("gamepadconnected", handleGamepadConnected);
        window.removeEventListener("gamepaddisconnected", handleGamepadDisconnected);
    };
  }, [gamepadIndex]);

  useEffect(() => {
    let animationFrameId: number;

    const pollGamepad = () => {
        if (gamepadIndex === null) {
          animationFrameId = requestAnimationFrame(pollGamepad);
          return;
        }
        const gamepad = navigator.getGamepads()[gamepadIndex];
        if (!gamepad) {
          animationFrameId = requestAnimationFrame(pollGamepad);
          return;
        }

        const DEADZONE = 0.5;

        // --- GLOBAL ACTIONS ---
        if (gameState === 'playing' || gameState === 'paused') {
            const startPressed = gamepad.buttons[9]?.pressed;
            if (startPressed && !pauseButtonWasPressed.current) {
                handlePauseToggle();
            }
            pauseButtonWasPressed.current = startPressed ?? false;
        }
        
        // --- STATE-SPECIFIC NAVIGATION ---
        if (gameState === 'menu') {
            const axisX = gamepad.axes[0] ?? 0;
            const axisY = gamepad.axes[1] ?? 0;
            const dpadLeft = gamepad.buttons[14]?.pressed;
            const dpadRight = gamepad.buttons[15]?.pressed;
            const dpadUp = gamepad.buttons[12]?.pressed;
            const dpadDown = gamepad.buttons[13]?.pressed;

            // Vertical Navigation
            if ((dpadDown && !dpadPressed.current.y) || (axisY > DEADZONE && !axisMoved.current.y)) {
                if(focusedButtonIndex <= 3) setFocusedButtonIndex(4); // From weather to start
            } else if ((dpadUp && !dpadPressed.current.y) || (axisY < -DEADZONE && !axisMoved.current.y)) {
                if(focusedButtonIndex === 4) setFocusedButtonIndex(lastWeatherFocusIndex); // From start to last weather
            }
            dpadPressed.current.y = dpadUp || dpadDown;
            axisMoved.current.y = Math.abs(axisY) > DEADZONE;
            
            // Horizontal Navigation
            if ((dpadRight && !dpadPressed.current.x) || (axisX > DEADZONE && !axisMoved.current.x)) {
                if (focusedButtonIndex <= 3) {
                    const newIndex = (focusedButtonIndex + 1) % 4;
                    setFocusedButtonIndex(newIndex);
                    setLastWeatherFocusIndex(newIndex);
                }
            } else if ((dpadLeft && !dpadPressed.current.x) || (axisX < -DEADZONE && !axisMoved.current.x)) {
                if (focusedButtonIndex <= 3) {
                    const newIndex = (focusedButtonIndex - 1 + 4) % 4;
                    setFocusedButtonIndex(newIndex);
                    setLastWeatherFocusIndex(newIndex);
                }
            }
            dpadPressed.current.x = dpadLeft || dpadRight;
            axisMoved.current.x = Math.abs(axisX) > DEADZONE;
            
            // Selection
            const selectPressed = gamepad.buttons[0]?.pressed || gamepad.buttons[2]?.pressed; // A or X
            if (selectPressed && !menuSelectWasPressed.current) {
                if (focusedButtonIndex <= 3) {
                    setWeather(weatherOptions[focusedButtonIndex]);
                } else if (focusedButtonIndex === 4) {
                    handleStartGame();
                }
            }
            menuSelectWasPressed.current = selectPressed ?? false;

        } else if (gameState === 'paused') {
            const axisY = gamepad.axes[1] ?? 0;
            const dpadUp = gamepad.buttons[12]?.pressed;
            const dpadDown = gamepad.buttons[13]?.pressed;

            // Vertical Navigation
            if ((dpadDown && !dpadPressed.current.y) || (axisY > DEADZONE && !axisMoved.current.y)) {
                setPauseFocusedIndex(prev => (prev + 1) % 5); // 5 items: wind, diff, colors, resume, menu
            } else if ((dpadUp && !dpadPressed.current.y) || (axisY < -DEADZONE && !axisMoved.current.y)) {
                setPauseFocusedIndex(prev => (prev - 1 + 5) % 5);
            }
            dpadPressed.current.y = dpadUp || dpadDown;
            axisMoved.current.y = Math.abs(axisY) > DEADZONE;

            const axisX = gamepad.axes[0] ?? 0;
            const dpadLeft = gamepad.buttons[14]?.pressed;
            const dpadRight = gamepad.buttons[15]?.pressed;

            // Horizontal Navigation / Value Change
            if ((dpadRight && !dpadPressed.current.x) || (axisX > DEADZONE && !axisMoved.current.x)) {
                if (pauseFocusedIndex === 0) setWindSpeed(s => Math.min(2, s + 0.1));
                else if (pauseFocusedIndex === 1) setDifficulty(d => Math.min(1, d + 0.1));
                else if (pauseFocusedIndex === 2) setColorFocusedIndex(c => (c + 1) % colors.length);
            } else if ((dpadLeft && !dpadPressed.current.x) || (axisX < -DEADZONE && !axisMoved.current.x)) {
                if (pauseFocusedIndex === 0) setWindSpeed(s => Math.max(0, s - 0.1));
                else if (pauseFocusedIndex === 1) setDifficulty(d => Math.max(0, d - 0.1));
                else if (pauseFocusedIndex === 2) setColorFocusedIndex(c => (c - 1 + colors.length) % colors.length);
            }
            dpadPressed.current.x = dpadLeft || dpadRight;
            axisMoved.current.x = Math.abs(axisX) > DEADZONE;
            
            // Selection
            const selectPressed = gamepad.buttons[0]?.pressed || gamepad.buttons[2]?.pressed; // A or X
            if (selectPressed && !menuSelectWasPressed.current) {
                if (pauseFocusedIndex === 2) setKiteColor(colors[colorFocusedIndex]);
                else if (pauseFocusedIndex === 3) handlePauseToggle();
                else if (pauseFocusedIndex === 4) handleGoToMenu();
            }
            menuSelectWasPressed.current = selectPressed ?? false;
        }

        animationFrameId = requestAnimationFrame(pollGamepad);
    };

    pollGamepad();

    return () => {
        cancelAnimationFrame(animationFrameId);
    };
}, [gameState, gamepadIndex, handlePauseToggle, handleStartGame, focusedButtonIndex, lastWeatherFocusIndex, pauseFocusedIndex, colorFocusedIndex, handleGoToMenu, kiteColor, setDifficulty, setKiteColor, setWindSpeed]);


  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black font-sans text-white">
      {gameState !== 'menu' && (
        <KiteCanvas 
          windSpeed={windSpeed} 
          kiteColor={kiteColor}
          score={score}
          setScore={setScore}
          difficulty={difficulty}
          weather={weather}
          isPaused={gameState === 'paused'}
          isMuted={isMuted}
          gamepadIndex={gamepadIndex}
        />
      )}
      
      {gameState === 'menu' && (
          <StartMenu 
            onStart={handleStartGame}
            weather={weather}
            setWeather={setWeather}
            focusedButtonIndex={focusedButtonIndex}
          />
      )}
      
      {gameState === 'paused' && (
        <PauseMenu
          onResume={handlePauseToggle}
          onMenu={handleGoToMenu}
          windSpeed={windSpeed}
          setWindSpeed={setWindSpeed}
          kiteColor={kiteColor}
          setKiteColor={setKiteColor}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          focusedIndex={pauseFocusedIndex}
          focusedColorIndex={colorFocusedIndex}
        />
      )}
    </div>
  );
}

export default App;