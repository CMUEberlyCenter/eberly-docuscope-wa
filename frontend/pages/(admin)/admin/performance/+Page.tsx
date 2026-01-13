import { FC } from "react";
import { Card } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useData } from "vike-react/useData";
import { Data } from "./+data";

const msToDuration = (ms: number) => ({
  months: Math.floor(ms / 2592000000),
  days: Math.floor((ms % 2592000000) / 86400000),
  hours: Math.floor((ms % 86400000) / 3600000),
  minutes: Math.floor((ms % 3600000) / 60000),
  seconds: Math.floor((ms % 60000) / 1000),
  milliseconds: ms % 1000,
});

const DateRange: FC<{ start: Date; end: Date }> = ({ start, end }) => {
  const duration = msToDuration(end.getTime() - start.getTime());

  return (
    <span>
      {new Intl.DateTimeFormat("en").formatRange(start, end)} (
      {new Intl.DurationFormat("en", { style: "short" }).format(duration)})
    </span>
  );
};
export const Page: FC = () => {
  const { performance } = useData<Data>();
  const { t } = useTranslation();
  return (
    <Card>
      <Card.Header>{t("admin.performance.title")}</Card.Header>
      <Card.Body>
        <Card.Text as="div">
          {performance.length === 0 && <p>{t("admin.performance.no_data")}</p>}
          {performance.map((entry) => (
            <div key={entry._id} style={{ marginBottom: "1em" }}>
              <h5>Prompt: {entry._id}</h5>
              <ul>
                <li>
                  Count: {entry.count.toLocaleString()} between{" "}
                  <DateRange
                    start={new Date(entry.startTime)}
                    end={new Date(entry.endTime)}
                  />
                </li>
                <li>
                  Time/Request:
                  <ul>
                    <li>
                      Average:{" "}
                      {new Intl.DurationFormat("en", { style: "long" }).format(
                        msToDuration(Math.floor(entry.avgTime))
                      )}
                    </li>
                    <li>
                      Min:{" "}
                      {new Intl.DurationFormat("en", { style: "long" }).format(
                        msToDuration(Math.floor(entry.minTime))
                      )}
                    </li>
                    <li>
                      Max:{" "}
                      {new Intl.DurationFormat("en", { style: "long" }).format(
                        msToDuration(Math.floor(entry.maxTime))
                      )}
                    </li>
                  </ul>
                </li>
                <li>
                  Average Input Tokens: {entry.avgInputTokens.toLocaleString()}
                </li>
                <li>
                  Average Output Tokens:{" "}
                  {entry.avgOutputTokens.toLocaleString()}
                </li>
                <li>
                  Average Cache Creation Tokens:{" "}
                  {entry.avgCacheCreate.toLocaleString()}
                </li>
                <li>
                  Max Cache Creation Tokens:{" "}
                  {entry.maxCacheCreate.toLocaleString()}
                </li>
                <li>
                  Average Cache Read Tokens:{" "}
                  {entry.avgCacheRead.toLocaleString()}
                </li>
                <li>
                  Max Cache Read Tokens: {entry.maxCacheRead.toLocaleString()}
                </li>
              </ul>
            </div>
          ))}
        </Card.Text>
      </Card.Body>
    </Card>
  );
};
