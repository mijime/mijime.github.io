---
Description: ''
Tags: ['Development', 'Azure']
CreatedAt: '2017-09-16T07:48:28+09:00'
Title: 'Azure Resource Managerを通じてAzureを学ぶ'
Draft: false
---

## Azure におけるテンプレートの立ち位置

Azureizm では `Azure Resource Manager` と呼ぶらしい。

- https://docs.microsoft.com/ja-jp/azure/azure-resource-manager/

## ソース

Azure Quickstart Templates

- https://github.com/Azure/azure-quickstart-templates

## 進め方

下の URL をなぞって勉強することにする

- Resource Manager テンプレートと Azure CLI を使用したリソースのデプロイ

  - https://docs.microsoft.com/ja-jp/azure/azure-resource-manager/resource-group-template-deploy-cli

今回は azure-cli を使ったので `az` を `azure` に読み替えて実行。

- https://github.com/Azure/azure-cli

ロケーションは `Japan East` を使うことにした。

- https://azure.microsoft.com/ja-jp/regions/

テンプレートは ContainerService のサンプルを使うようにする

- 101-acs-swarm

と思ったけどリージョン制限があった。。ここで冒険はおしまい

### vmSize がらみの悩み

vmSize は `Standard_XXX` でいいのかしら

- `Standard_B1MS` ではダメだった。プレビューだから、なのかな
- `Standard_A1_v2` はリージョン依存
- 結構制限があった。悲しい
- そもそもマスタ用の vmSize が。。というところのよう。辛い

### Template がらみの悩み

SSHPublicKey は RSA じゃないとダメ

### Azure-Cli がらみの悩み

`validate`コマンドが使えない。。だと。。

参考 URL では@を使っていたけど azure-cli では
パラメータファイルを指定する場合は `--parameters-file` を使う。

## 料金

押さえておかないと辛そう

- https://azure.microsoft.com/ja-jp/pricing/details/virtual-machines/linux/

## Documentation

リファレンス

- https://docs.microsoft.com/ja-jp/azure/templates/

## サービス

Microsoft.ContainerService/containerServices

- https://azure.microsoft.com/ja-jp/services/container-service/

Microsoft.ServiceFabric/clusters

- https://azure.microsoft.com/ja-jp/services/service-fabric/

## AWS の比較

- https://docs.microsoft.com/ja-jp/azure/architecture/aws-professional/services
