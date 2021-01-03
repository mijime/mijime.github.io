import { PropsWithChildren } from 'react'
import Head from 'next/head'

import { SitesApp } from '@/applications/sites/'
import GithubEditButton from '@/components/atoms/github-edit-button/'
import ArticleCard from '@/components/molecules/article-card/'
import DefaultLayout from '@/components/templates/default/'
import { buildMetadataByFrontMatter } from '@/infrastructures/functions/markdown/'

type PostPageProps = {
  frontMatter: {
    __resourcePath: string
    [key: string]: any
  }
}

export default function PostPage({
  frontMatter,
  children
}: PropsWithChildren<PostPageProps>) {
  const metadata = buildMetadataByFrontMatter(frontMatter)
  const siteName = SitesApp.getSiteName()
  const githubEditURL = SitesApp.getGithubEditURL()
  return (
    <DefaultLayout siteName={siteName}>
      <Head>
        <title>
          {metadata.title} | {siteName}
        </title>
      </Head>
      <ArticleCard {...metadata}>
        <div className="prose">{children}</div>

        <div className="flex justify-end py-2">
          <GithubEditButton
            githubURL={githubEditURL}
            filepath={`pages/${frontMatter.__resourcePath}`}
          ></GithubEditButton>
        </div>
      </ArticleCard>
    </DefaultLayout>
  )
}
