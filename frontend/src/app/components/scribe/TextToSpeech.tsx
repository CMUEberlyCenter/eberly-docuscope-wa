/**
 * Button group for playing, pausing, and stopping speech synthesis of
 * a given text.
 * @module components/scribe/TextToSpeach
 */
import {
  faClose,
  faPause,
  faPlay,
  faStop,
  faVolumeHigh,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, useCallback, useEffect, useState } from "react";
import { Button, ButtonGroup, Collapse } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../service/settings.service";

/**
 * Component for adding text to speech controls.
 * @component
 * @example
 *   (<TextToSpeech text={"Some text to read aloud."}/>)
 */
export const TextToSpeech: FC<{ text: string }> = ({
  text,
}: {
  text: string;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [utterance, setUtterance] = useState<null | SpeechSynthesisUtterance>(
    null
  );
  const settings = useSettings();

  /** Update utterance on change of text. */
  useEffect(() => {
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(text);
    setUtterance(utter);
    return () => {
      synth.cancel();
    };
  }, [text]);

  /** Cancel on close tools */
  useEffect(() => {
    if (!open) {
      const synth = window.speechSynthesis;
      synth.cancel();
    }
  }, [open]);

  /** Start utterance when play is pressed or resume if paused. */
  const handlePlay = useCallback(() => {
    const synth = window.speechSynthesis;
    console.log(isPaused, utterance?.text);
    if (isPaused) {
      synth.resume();
    } else if (utterance !== null) {
      synth.speak(utterance);
    }
    setIsPaused(false);
  }, [utterance, isPaused]);
  /** Pause the current utterance. */
  const handlePause = () => {
    const synth = window.speechSynthesis;
    synth.pause();
    setIsPaused(true);
  };
  /** Stop playing and reset speech. */
  const handleStop = () => {
    const synth = window.speechSynthesis;
    synth.cancel();
    setIsPaused(false);
  };

  return settings.text2speech ? (
    <ButtonGroup>
      <Collapse in={open} dimension={"width"}>
        <ButtonGroup>
          <Button onClick={handlePlay} title={isPaused ? "Resume" : "Play"}>
            <FontAwesomeIcon icon={isPaused ? faPause : faPlay} />
            <span className="sr-only">{isPaused ? "Resume" : "Play"}</span>
          </Button>
          <Button onClick={handlePause} title="Pause">
            <FontAwesomeIcon icon={faPause} />
            <span className="sr-only">Pause</span>
          </Button>
          <Button onClick={handleStop} title="Stop">
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
            <FontAwesomeIcon icon={faVolumeHigh} />
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
