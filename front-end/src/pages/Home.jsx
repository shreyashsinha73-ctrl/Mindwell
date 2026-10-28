import { useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-8 px-6 py-10 text-center">
      <header className="space-y-4">
        <h1 className="text-5xl font-extrabold tracking-tight text-slate-950 sm:text-6xl">
          Mindwell
        </h1>
        <p className="text-2xl leading-relaxed text-slate-800">
          A few short games to see how your memory and thinking are today.
        </p>
      </header>

      <section
        aria-labelledby="what-to-expect-heading"
        className="w-full rounded-2xl border-2 border-slate-300 bg-white p-6 text-left shadow-sm sm:p-8"
      >
        <h2
          id="what-to-expect-heading"
          className="mb-4 text-2xl font-bold text-slate-950"
        >
          What to expect
        </h2>
        <ul className="list-disc space-y-3 pl-7 text-xl leading-relaxed text-slate-900 marker:text-sky-900">
          <li>9 short games</li>
          <li>About 10 to 15 minutes</li>
          <li>No need to rush. Nothing here is a pass or fail test.</li>
        </ul>
        <p className="mt-5 text-lg leading-relaxed text-slate-800">
          A family member or carer can sit alongside you.
        </p>
      </section>

      <div className="space-y-3 text-lg leading-relaxed text-slate-800">
        <p>Your results are saved under an anonymous code, not your name.</p>
        <p>This is a screening indicator, not a medical diagnosis.</p>
      </div>

      <Button
        size="lg"
        className="min-h-20 min-w-64 text-2xl"
        onClick={() => navigate("/assessment")}
      >
        Start
      </Button>
    </div>
  );
}
