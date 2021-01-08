FROM node:15

WORKDIR /var/app
COPY package*.json /var/app
RUN npm clean-install
COPY . /var/app
RUN npm run build

ENV TINI_VERSION v0.19.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini

ENTRYPOINT ["/tini", "--", "npm", "run"]
CMD ["dev"]
