export default function GoogleAnalyticsScript({
  trackingID
}: {
  trackingID: string
}) {
  return (
    <>
      <script
        src={`https://www.googletagmanager.com/gtag/js?id=${trackingID}`}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
window.dataLayer = window.dataLayer || [];
window.gtag = function(){dataLayer.push(arguments);}
window.gtag('js', new Date());
window.gtag('config', '${trackingID}', {page_path: window.location.pathname});
`
        }}
      />
    </>
  )
}
