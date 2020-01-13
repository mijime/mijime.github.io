FROM node:latest

ARG USERNAME=node
ARG USER_UID=1000
ARG USER_GID=$USER_UID

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends apt-utils dialog \
    && apt-get install -y --no-install-recommends git iproute2 procps \
    && rm -rf /opt/yarn-* \
    && rm -f /usr/local/bin/yarn \
    && rm -f /usr/local/bin/yarnpkg \
    && apt-get install -y --no-install-recommends curl apt-transport-https lsb-release \
    && npm install -g eslint \
    && if [ "$USER_GID" != "1000" ] || [ "$USER_UID" != "1000" ]; then \
        groupmod --gid $USER_GID $USERNAME \
        && usermod --uid $USER_UID --gid $USER_GID $USERNAME \
        && chown -R $USER_UID:$USER_GID /home/$USERNAME; \
    fi \
    && apt-get install -y --no-install-recommends sudo \
    && echo node ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME \
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

ARG HUGO_VER=0.62.2
RUN curl -LO https://github.com/gohugoio/hugo/releases/download/v${HUGO_VER}/hugo_${HUGO_VER}_Linux-64bit.tar.gz \
    && tar xvfz hugo_${HUGO_VER}_Linux-64bit.tar.gz -C /usr/local/bin/ \
    && rm hugo_${HUGO_VER}_Linux-64bit.tar.gz

ENV DEBIAN_FRONTEND=dialog
