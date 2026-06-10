import { FC } from "react";
import { Button, ButtonGroup, Card } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useData } from "vike-react/useData";
import { Data } from "./+data";
import { handleDownload } from "./handleDownload";

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
      {new Intl.DateTimeFormat(navigator.languages).formatRange(start, end)} (
      {new Intl.DurationFormat(navigator.languages, { style: "short" }).format(
        duration
      )}
      )
    </span>
  );
};
export const Page: FC = () => {
  const { performance, session } = useData<Data>();
  const { t } = useTranslation("admin");
  return (
    <Card>
      <Card.Header>
        {t("performance.title")}
        {performance.length > 0 || session.length > 0 ? (
          <ButtonGroup className="float-end">
            {performance.length > 0 && (
              <Button
                variant="link"
                title="performance_data.json"
                onClick={() =>
                  handleDownload(
                    JSON.stringify(performance, null, 2),
                    "performance_data.json"
                  )
                }
              >
                {t("performance.download")}
              </Button>
            )}
            {session.length > 0 && (
              <Button
                variant="link"
                title="session_data.json"
                onClick={() =>
                  handleDownload(
                    JSON.stringify(session, null, 2),
                    "session_data.json"
                  )
                }
              >
                {t("performance.download_session")}
              </Button>
            )}
          </ButtonGroup>
        ) : null}
      </Card.Header>
      <Card.Body>
        <Card.Text as="div">
          {performance.length === 0 && <p>{t("performance.no_data")}</p>}
          {performance.map((entry) => (
            <div key={entry._id} style={{ marginBottom: "1em" }}>
              <h5>{t("performance.prompt", { prompt: entry._id })}</h5>
              <ul>
                <li>
                  {t("performance.range", {
                    count: entry.count.toLocaleString(),
                  })}
                  <DateRange
                    start={new Date(entry.startTime)}
                    end={new Date(entry.endTime)}
                  />
                </li>
                <li>
                  {t("performance.time_per_request")}
                  <ul>
                    <li>
                      {t("performance.average", {
                        time: new Intl.DurationFormat(navigator.languages, {
                          style: "long",
                        }).format(msToDuration(Math.floor(entry.avgTime))),
                      })}
                    </li>
                    <li>
                      {t("performance.minimum", {
                        time: new Intl.DurationFormat(navigator.languages, {
                          style: "long",
                        }).format(msToDuration(Math.floor(entry.minTime))),
                      })}
                    </li>
                    <li>
                      {t("performance.maximum", {
                        time: new Intl.DurationFormat(navigator.languages, {
                          style: "long",
                        }).format(msToDuration(Math.floor(entry.maxTime))),
                      })}
                    </li>
                  </ul>
                </li>
                <li>
                  {t("performance.average_input_tokens", {
                    tokens: entry.avgInputTokens.toLocaleString(),
                  })}
                </li>
                <li>
                  {t("performance.average_output_tokens", {
                    tokens: entry.avgOutputTokens.toLocaleString(),
                  })}
                </li>
                <li>
                  {t("performance.average_cache_creation_input_tokens", {
                    tokens: entry.avgCacheCreate.toLocaleString(),
                  })}
                </li>
                <li>
                  {t("performance.max_cache_creation_input_tokens", {
                    tokens: entry.maxCacheCreate.toLocaleString(),
                  })}
                </li>
                <li>
                  {t("performance.average_cache_read_input_tokens", {
                    tokens: entry.avgCacheRead.toLocaleString(),
                  })}
                </li>
                <li>
                  {t("performance.max_cache_read_input_tokens", {
                    tokens: entry.maxCacheRead.toLocaleString(),
                  })}
                </li>
              </ul>
            </div>
          ))}
          <table className="table table-sm caption-top">
            <caption>{t("performance.session.title")}</caption>
            <thead>
              <tr>
                <th rowSpan={2} scope="col">
                  {t("performance.session.id")}
                </th>
                <th colSpan={4} scope="colgroup">
                  {t("performance.session.token_count")}
                </th>
              </tr>
              <tr>
                <th scope="col">{t("performance.session.input_tokens")}</th>
                <th scope="col">{t("performance.session.output_tokens")}</th>
                <th scope="col">
                  {t("performance.session.cache_creation_input_tokens")}
                </th>
                <th scope="col">
                  {t("performance.session.cache_read_input_tokens")}
                </th>
              </tr>
            </thead>
            <tbody>
              {session.map((entry) => (
                <tr key={entry._id}>
                  <td>{entry._id}</td>
                  <td>{entry.input_tokens}</td>
                  <td>{entry.output_tokens}</td>
                  <td>{entry.cache_creation_input_tokens}</td>
                  <td>{entry.cache_read_input_tokens}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card.Text>
      </Card.Body>
    </Card>
  );
};
