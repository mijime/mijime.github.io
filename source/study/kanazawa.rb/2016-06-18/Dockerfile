FROM ruby

COPY Gemfile /var/app/Gemfile
WORKDIR /var/app
RUN bundle install
RUN apt-get update && apt-get install -y zip
