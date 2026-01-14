/**
 * Button group for playing, pausing, and stopping speech synthesis of
 * a given text.
 * @module components/TextToSpeach
 */
import {
  faClose,
  faPause,
  faPlay,
  faStop,
  faVolumeHigh,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type FC, useCallback, useEffect, useState } from "react";
import { Button, ButtonGroup, Collapse } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { usePageContext } from "vike-react/usePageContext";

/**
 * Component for adding text to speech controls.
 * @example
 *   (&lt;TextToSpeech text={"Some text to read aloud."}/&gt;)
 */
export const TextToSpeech: FC<{
  /** The text to be read aloud. */
  text: string;
  /** Whether the text to speech feature is enabled. If not provided, it defaults to the application's settings. */
  enabled?: boolean;
}> = ({ text, enabled }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"paused" | "stopped" | "playing">(
    "stopped"
  );
  const [utterance, setUtterance] = useState<null | SpeechSynthesisUtterance>(
    null
  );
  enabled = enabled ?? usePageContext()?.settings?.text2speech;

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  /** Update utterance on change of text. */
  useEffect(() => {
    setState("stopped");
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    setUtterance(utter);
  }, [text]);

  /** Cancel on close tools */
  useEffect(() => {
    setState("stopped");
    window.speechSynthesis.cancel();
  }, [open]);

  /** Start utterance when play is pressed or resume if paused. */
  const handlePlay = useCallback(() => {
    const synth = window.speechSynthesis;
    if (state === "paused") {
      if (synth.paused) {
        synth.resume();
      } else if (utterance) {
        synth.speak(utterance);
      }
      if (synth.speaking) {
        setState("playing");
      }
    } else if (state === "playing") {
      synth.pause();
      setState("paused");
    } else if (utterance !== null) {
      synth.speak(utterance);
      if (synth.speaking) {
        setState("playing");
      }
    }
  }, [utterance, state]);
  /** Stop playing and reset speech. */
  const handleStop = () => {
    setState("stopped");
    window.speechSynthesis.cancel();
  };

  return enabled ? (
    <ButtonGroup>
      <Collapse in={open} dimension={"width"}>
        <ButtonGroup>
          <Button
            variant="primary"
            onClick={handlePlay}
            title={state === "paused" ? "Resume" : "Play"}
          >
            <FontAwesomeIcon icon={state === "playing" ? faPause : faPlay} />
            <span className="sr-only">
              {state === "paused" ? "Resume" : "Play"}
            </span>
          </Button>
          <Button variant="primary" onClick={handleStop} title="Stop">
            <FontAwesomeIcon icon={faStop} />
            <span className="sr-only">Stop</span>
          </Button>
        </ButtonGroup>
      </Collapse>
      <Button
        onClick={() => setOpen(!open)}
        variant={!open ? "icon" : "primary"}
      >
        {!open ? (
          <>
            <FontAwesomeIcon icon={faVolumeHigh} className="text-primary" />
            <span className="sr-only visually-hidden">{t("audio.show")}</span>
          </>
        ) : (
          <>
            <FontAwesomeIcon icon={faClose} />
            <span className="sr-only visually-hidden">{t("audio.hide")}</span>
          </>
        )}
      </Button>
    </ButtonGroup>
  ) : (
    <></>
  );
};
