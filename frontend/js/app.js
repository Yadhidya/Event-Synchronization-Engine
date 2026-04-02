import { useState, useEffect, useRef } from "react"
import passages from "./data/data.json"

function App() {

  const [difficulty, setDifficulty] = useState("hard")
  const [passage, setPassage] = useState("")
  const [typed, setTyped] = useState("")

  const [timeLeft, setTimeLeft] = useState(60)
  const [running, setRunning] = useState(false)

  const [wpm, setWpm] = useState(0)
  const [accuracy, setAccuracy] = useState(100)

  const [best, setBest] = useState(
    Number(localStorage.getItem("bestWPM")) || 0
  )

  const inputRef = useRef()

  useEffect(() => {
    loadPassage()
  }, [difficulty])

  useEffect(() => {

    if (!running) return

    if (timeLeft === 0) {

      setRunning(false)

      if (wpm > best) {
        localStorage.setItem("bestWPM", wpm)
        setBest(wpm)
      }

      return
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)

  }, [running, timeLeft])


  const loadPassage = () => {

    const list = passages[difficulty]
    const random = Math.floor(Math.random() * list.length)

    setPassage(list[random].text)

    setTyped("")
    setTimeLeft(60)
    setWpm(0)
    setAccuracy(100)
    setRunning(false)

    setTimeout(() => inputRef.current.focus(), 0)
  }


  const calculateStats = (value) => {

    let correct = 0

    for (let i = 0; i < value.length; i++) {
      if (value[i] === passage[i]) correct++
    }

    const acc = value.length
      ? Math.round((correct / value.length) * 100)
      : 100

    const words = correct / 5

    const minutes = (60 - timeLeft) / 60 || 1 / 60

    const wpmValue = Math.round(words / minutes)

    setAccuracy(acc)
    setWpm(wpmValue)
  }


  const handleTyping = (e) => {

    if (timeLeft === 0) return

    if (!running) setRunning(true)

    const value = e.target.value

    setTyped(value)

    calculateStats(value)
  }


  const characters = passage.split("")


  return (
    <div className="min-h-screen bg-neutral-900 text-white flex justify-center">

      <div className="max-w-5xl w-full px-6 py-10">

        {/* Header */}

        <div className="flex justify-between items-start mb-6">

          <div>

            <h1 className="text-2xl font-bold flex items-center gap-2">
              ⌨️ Typing Speed Test
            </h1>

            <p className="text-sm text-neutral-400">
              Type as fast as you can in 60 seconds
            </p>

          </div>

          <div className="text-yellow-400 text-sm">
            🏆 Personal Best: {best} WPM
          </div>

        </div>


        {/* Stats */}

        <div className="flex gap-6 text-lg mb-4">

          <span>
            WPM: <span className="font-semibold">{wpm}</span>
          </span>

          <span>
            Accuracy: <span className="text-red-400">{accuracy}%</span>
          </span>

          <span>
            Time:{" "}
            <span className="text-yellow-300">
              0:{timeLeft.toString().padStart(2, "0")}
            </span>
          </span>

        </div>

        <hr className="border-neutral-700 mb-6" />


        {/* Difficulty */}

        <div className="flex items-center gap-3 mb-6">

          <span className="text-neutral-400">Difficulty:</span>

          {["easy", "medium", "hard"].map((level) => (

            <button
              key={level}
              onClick={() => setDifficulty(level)}
              className={`px-3 py-1 rounded border
              ${
                difficulty === level
                  ? "border-blue-500 text-blue-400"
                  : "border-neutral-700 text-neutral-400"
              }`}
            >
              {level}
            </button>

          ))}

        </div>


        {/* Passage */}

        <div className="text-xl leading-relaxed min-h-[140px]">

          {characters.map((char, index) => {

            let style = "text-neutral-500"

            if (index < typed.length) {

              style =
                typed[index] === char
                  ? "text-green-400"
                  : "text-red-400 underline"

            }

            return (
              <span key={index} className={style}>
                {char}
              </span>
            )

          })}

        </div>


        {/* Hidden Input */}

        <textarea
          ref={inputRef}
          value={typed}
          onChange={handleTyping}
          className="opacity-0 absolute"
          autoFocus
        />


        {/* Restart */}

        <div className="flex justify-center mt-10">

          <button
            onClick={loadPassage}
            className="bg-neutral-700 hover:bg-neutral-600 px-6 py-2 rounded"
          >
            Restart Test ↻
          </button>

        </div>

      </div>

    </div>
  )
}

export default App
