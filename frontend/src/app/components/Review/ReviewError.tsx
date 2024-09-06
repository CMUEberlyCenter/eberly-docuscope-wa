import { FC } from "react"
import { Alert } from "react-bootstrap"
import { Translation } from "react-i18next"

export const ReviewError: FC<{ error: Error, resetErrorBoundary: () => void }> = ({ error }) => (
  <Translation ns={'review'}>
    {t => <Alert variant="danger">
      <Alert.Heading>{t('error.header')}</Alert.Heading>
      <p>{t('error.content')}</p>
      {!!error?.message && <p>{t('error.details', { message: error.message })}</p>}
    </Alert>}
  </Translation>
)
